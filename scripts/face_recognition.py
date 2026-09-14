#!/usr/bin/env python3
"""
Face recognition using InsightFace (ArcFace + SCRFD).
Outputs JSON to stdout for Node.js consumption.
"""

import sys
import json
import os
import cv2
import numpy as np
from pathlib import Path

# InsightFace imports
try:
    import insightface
    from insightface.app import FaceAnalysis
except ImportError:
    print(json.dumps({"error": "insightface not installed"}), file=sys.stderr)
    sys.exit(1)

UPLOAD_DIR = os.environ.get('UPLOAD_DIR', './data/uploads')
MODELS_DIR = os.environ.get('INSIGHTFACE_MODELS', '/root/.insightface/models')

# Initialize FaceAnalysis (buffalo_l = SCRFD detector + ArcFace recognizer)
app = FaceAnalysis(name='buffalo_l', root=MODELS_DIR, providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))


def read_image(image_path: str) -> np.ndarray:
    """Read image from disk."""
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image not found: {image_path}")
    return img


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two embeddings."""
    a_norm = a / (np.linalg.norm(a) + 1e-10)
    b_norm = b / (np.linalg.norm(b) + 1e-10)
    return float(np.dot(a_norm, b_norm))


def cluster_embeddings(embeddings: list, threshold: float = 0.55) -> list:
    """
    Simple agglomerative clustering of face embeddings.
    Returns list of cluster indices for each embedding.
    """
    if not embeddings:
        return []

    clusters = []  # list of lists of embeddings
    labels = []

    for emb in embeddings:
        best_cluster = -1
        best_sim = -1.0

        for ci, cluster in enumerate(clusters):
            # Compute cluster centroid
            centroid = np.mean(cluster, axis=0)
            sim = cosine_similarity(emb, centroid)
            if sim > best_sim:
                best_sim = sim
                best_cluster = ci

        if best_cluster >= 0 and best_sim >= threshold:
            clusters[best_cluster].append(emb)
            labels.append(best_cluster)
        else:
            clusters.append([emb])
            labels.append(len(clusters) - 1)

    return labels


def detect_faces_in_image(image_path: str) -> list:
    """Detect faces and extract embeddings from a single image."""
    img = read_image(image_path)
    faces = app.get(img)

    results = []
    for face in faces:
        if face.det_score < 0.5:
            continue
        box = face.bbox.astype(int)
        results.append({
            "box": {
                "x": int(box[0]),
                "y": int(box[1]),
                "width": int(box[2] - box[0]),
                "height": int(box[3] - box[1])
            },
            "embedding": face.embedding.tolist(),
            "confidence": float(face.det_score)
        })
    return results


def analyze_all_photos(db_path: str) -> list:
    """
    Analyze all photos in the database for faces.
    Returns list of {media_id, file_path, detections}.
    """
    import sqlite3
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, file_path FROM adventure_media WHERE media_type = 'photo' AND file_path IS NOT NULL"
    )
    photos = cursor.fetchall()
    conn.close()

    results = []
    for media_id, file_path in photos:
        filename = file_path.replace('/uploads/', '')
        full_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(full_path):
            continue

        try:
            detections = detect_faces_in_image(full_path)
            if detections:
                results.append({
                    "media_id": media_id,
                    "file_path": file_path,
                    "detections": detections
                })
        except Exception as e:
            print(f"Error processing {full_path}: {e}", file=sys.stderr)

    return results


def get_person_references(db_path: str) -> list:
    """
    Get reference embeddings for known people from manual tags and avatars.
    Returns list of {person_id, name, embeddings: list}.
    """
    import sqlite3
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # People with manual tags
    cursor.execute("""
        SELECT DISTINCT mp.person_id, mp.media_id
        FROM media_people mp
        WHERE mp.tagged_by = 'user'
    """)
    manual_tags = cursor.fetchall()

    person_to_media = {}
    for person_id, media_id in manual_tags:
        if person_id not in person_to_media:
            person_to_media[person_id] = []
        person_to_media[person_id].append(media_id)

    references = []

    for person_id, media_ids in person_to_media.items():
        cursor.execute("SELECT name FROM people WHERE id = ?", (person_id,))
        row = cursor.fetchone()
        if not row:
            continue
        name = row[0]

        embeddings = []
        for media_id in media_ids:
            cursor.execute("SELECT file_path FROM adventure_media WHERE id = ?", (media_id,))
            row = cursor.fetchone()
            if not row or not row[0]:
                continue

            filename = row[0].replace('/uploads/', '')
            full_path = os.path.join(UPLOAD_DIR, filename)
            if not os.path.exists(full_path):
                continue

            try:
                detections = detect_faces_in_image(full_path)
                if detections:
                    # Take the largest face
                    largest = max(detections, key=lambda d: d['box']['width'] * d['box']['height'])
                    embeddings.append(np.array(largest['embedding']))
            except Exception:
                pass

        if embeddings:
            references.append({"person_id": person_id, "name": name, "embeddings": embeddings})

    # People with avatars (fallback)
    cursor.execute("SELECT id, name, avatar_file_path FROM people WHERE avatar_file_path IS NOT NULL")
    avatar_people = cursor.fetchall()
    conn.close()

    for person_id, name, avatar_path in avatar_people:
        if any(r['person_id'] == person_id for r in references):
            continue

        filename = avatar_path.replace('/uploads/', '')
        full_path = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(full_path):
            continue

        try:
            detections = detect_faces_in_image(full_path)
            if detections:
                references.append({
                    "person_id": person_id,
                    "name": name,
                    "embeddings": [np.array(detections[0]['embedding'])]
                })
        except Exception:
            pass

    return references


def run_backfill(db_path: str) -> dict:
    """Main backfill: cluster all faces, match to known people, write AI tags."""
    import sqlite3

    # Step 1: Get all faces in all photos
    media_faces = analyze_all_photos(db_path)
    if not media_faces:
        return {"tagged": 0, "processed": 0}

    # Collect embeddings for clustering
    all_embeddings = []
    embedding_to_media = []

    for mf in media_faces:
        for i, det in enumerate(mf['detections']):
            all_embeddings.append(np.array(det['embedding']))
            embedding_to_media.append({"media_id": mf['media_id'], "detection_idx": i})

    if not all_embeddings:
        return {"tagged": 0, "processed": len(media_faces)}

    # Step 2: Cluster all faces
    cluster_labels = cluster_embeddings(all_embeddings, threshold=0.55)

    # Step 3: Get known person references
    references = get_person_references(db_path)

    # Step 4: Match clusters to known people
    cluster_to_person = {}
    max_cluster = max(cluster_labels) + 1

    for cluster_id in range(max_cluster):
        cluster_embs = [all_embeddings[i] for i, c in enumerate(cluster_labels) if c == cluster_id]
        if not cluster_embs:
            continue

        centroid = np.mean(cluster_embs, axis=0)

        best_person = None
        best_sim = 0.0

        for ref in references:
            sims = [cosine_similarity(centroid, ref_emb) for ref_emb in ref['embeddings']]
            avg_sim = np.mean(sims)
            if avg_sim > best_sim and avg_sim >= 0.55:
                best_sim = avg_sim
                best_person = {"person_id": ref['person_id'], "name": ref['name']}

        if best_person:
            cluster_to_person[cluster_id] = best_person

    # Step 5: Write AI tags
    tagged = 0
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    for i, cluster_id in enumerate(cluster_labels):
        match = cluster_to_person.get(cluster_id)
        if not match:
            continue

        em = embedding_to_media[i]
        media_id = em['media_id']
        detection_idx = em['detection_idx']

        mf = next((m for m in media_faces if m['media_id'] == media_id), None)
        if not mf or detection_idx >= len(mf['detections']):
            continue

        detection = mf['detections'][detection_idx]

        # Check if already tagged
        cursor.execute(
            "SELECT id FROM media_people WHERE media_id = ? AND person_id = ?",
            (media_id, match['person_id'])
        )
        if cursor.fetchone():
            continue

        # Insert AI tag
        cursor.execute("""
            INSERT INTO media_people (id, media_id, person_id, face_x, face_y, face_width, face_height, tagged_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ai')
        """, (
            os.urandom(16).hex(),
            media_id,
            match['person_id'],
            detection['box']['x'] / detection['box']['width'],
            detection['box']['y'] / detection['box']['height'],
            detection['box']['width'],
            detection['box']['height']
        ))
        tagged += 1

    conn.commit()
    conn.close()

    return {"tagged": tagged, "processed": len(media_faces)}


def get_stats(db_path: str) -> dict:
    """Get face recognition statistics."""
    import sqlite3

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM adventure_media WHERE media_type = 'photo' AND file_path IS NOT NULL")
    total_photos = cursor.fetchone()[0]

    media_faces = analyze_all_photos(db_path)
    photos_with_faces = len(media_faces)
    total_faces = sum(len(mf['detections']) for mf in media_faces)

    references = get_person_references(db_path)
    people_with_refs = len(references)

    cursor.execute("SELECT COUNT(*) FROM media_people WHERE tagged_by = 'ai'")
    ai_tags = cursor.fetchone()[0]

    conn.close()

    return {
        "totalPhotos": total_photos,
        "photosWithFaces": photos_with_faces,
        "totalFaces": total_faces,
        "peopleWithReferences": people_with_refs,
        "aiTags": ai_tags
    }


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: face_recognition.py <command> [db_path]"}))
        sys.exit(1)

    command = sys.argv[1]
    db_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(UPLOAD_DIR, '..', 'db.sqlite')

    try:
        if command == 'backfill':
            result = run_backfill(db_path)
            print(json.dumps(result))
        elif command == 'stats':
            result = get_stats(db_path)
            print(json.dumps(result))
        elif command == 'analyze':
            media_id = sys.argv[3]
            # Not implemented for single photo
            print(json.dumps({"error": "not implemented"}))
        else:
            print(json.dumps({"error": f"Unknown command: {command}"}))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)