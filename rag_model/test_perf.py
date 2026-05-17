import os
from rag_pipeline5 import medical_chatbot

full_prompt = 'Lab Results:\n' + '\n'.join([f'test{i}: 10' for i in range(50)]) + '\n\nPatient Question: "what is my wbc count?"'
print("Running medical_chatbot...")
medical_chatbot(full_prompt)
