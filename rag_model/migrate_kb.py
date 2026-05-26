import json
import shutil
import os

rag_dir = r'd:\website\complete_project\medical-report-chatbot\rag_model'
old_file = os.path.join(rag_dir, 'medical_knowledge.json')
new_file = os.path.join(rag_dir, 'medical_knowledge_new.json')
backup_file = os.path.join(rag_dir, 'medical_knowledge.json.backup')

try:
    # Backup original
    if os.path.exists(old_file):
        shutil.copy2(old_file, backup_file)
        print(f"Backup created: {backup_file}")
    
    # Replace with new version
    if os.path.exists(new_file):
        shutil.copy2(new_file, old_file)
        print(f"Replaced medical_knowledge.json")
        
        # Verify by loading
        with open(old_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"✓ Verification: {len(data.get('tests', {}))} tests loaded")
        
        # Clean up
        os.remove(new_file)
        print(f"Cleanup done")
    else:
        print("ERROR: medical_knowledge_new.json not found")
except Exception as e:
    print(f"ERROR: {e}")
