#!/usr/bin/env python3
import shutil
import os

rag_dir = r'd:\website\complete_project\medical-report-chatbot\rag_model'
old_file = os.path.join(rag_dir, 'medical_knowledge.json')
new_file = os.path.join(rag_dir, 'medical_knowledge_new.json')
backup_file = os.path.join(rag_dir, 'medical_knowledge.json.bak')

# Backup original
shutil.copy2(old_file, backup_file)
print(f"✓ Backup created: {backup_file}")

# Replace with new version
shutil.copy2(new_file, old_file)
print(f"✓ Replaced medical_knowledge.json with corrected version")

# Clean up
os.remove(new_file)
print(f"✓ Cleanup done")

print("\n✅ Medical knowledge base structure fixed!")
print(f"   Old file backed up to: medical_knowledge.json.bak")
