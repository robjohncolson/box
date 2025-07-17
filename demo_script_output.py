#!/usr/bin/env python3
"""
Demo script showing expected output from create_pok_curriculum.py
"""

import json

def demo_script_run():
    """Simulate running the script with fake data."""
    
    print("=== DEMO: create_pok_curriculum.py simulation ===")
    print()
    
    # Simulate console output
    print("Processing curriculum data from: /current/directory")
    print("Found 1 units")
    print()
    print("Processing unit1...")
    print("  Processing quiz: 1-2_q1")
    print("    Found JSON: /current/directory/assets/jsons/Unit1/ap_stats_u1_l2_quiz.json")
    print("    Found 3 MCQ questions")
    print("  Processing quiz: 1-3_q1")
    print("    Found JSON: /current/directory/assets/jsons/Unit1/ap_stats_u1_l3_quiz.json")
    print("    Found 2 MCQ questions")
    print("    Processed image: assets/pngs/unit3/u3_l3_q1.png")
    print()
    print("Successfully created: /current/directory/pok_curriculum.json")
    print("Total curriculum keys: 2")
    print("Total MCQ questions: 5")
    
    # Show example output JSON structure
    demo_output = {
        "unit1-1-2": [
            {
                "id": "q1_u1_l2",
                "type": "multiple-choice",
                "question": "What is the mean of the dataset [1, 2, 3, 4, 5]?",
                "options": [
                    {"id": "A", "text": "2"},
                    {"id": "B", "text": "3"},
                    {"id": "C", "text": "4"},
                    {"id": "D", "text": "5"}
                ],
                "correct_answer": "B",
                "explanation": "The mean is the sum divided by count: (1+2+3+4+5)/5 = 3"
            },
            {
                "id": "q2_u1_l2",
                "type": "multiple-choice",
                "question": "Which measure of central tendency is most affected by outliers?",
                "options": [
                    {"id": "A", "text": "Mean"},
                    {"id": "B", "text": "Median"},
                    {"id": "C", "text": "Mode"},
                    {"id": "D", "text": "Range"}
                ],
                "correct_answer": "A",
                "explanation": "The mean is most affected by outliers because it uses all values in its calculation."
            },
            {
                "id": "q3_u1_l2",
                "type": "multiple-choice",
                "question": "What type of variable is 'favorite color'?",
                "options": [
                    {"id": "A", "text": "Quantitative continuous"},
                    {"id": "B", "text": "Quantitative discrete"},
                    {"id": "C", "text": "Categorical"},
                    {"id": "D", "text": "Ordinal"}
                ],
                "correct_answer": "C",
                "explanation": "Favorite color is a categorical variable as it represents categories without numerical meaning."
            }
        ],
        "unit1-1-3": [
            {
                "id": "q1_u1_l3",
                "type": "multiple-choice",
                "question": "What does a histogram show?",
                "options": [
                    {"id": "A", "text": "Individual data points"},
                    {"id": "B", "text": "Distribution of data"},
                    {"id": "C", "text": "Correlation between variables"},
                    {"id": "D", "text": "Time series data"}
                ],
                "correct_answer": "B",
                "explanation": "A histogram shows the distribution of data by displaying frequency of values in intervals."
            },
            {
                "id": "q2_u1_l3",
                "type": "multiple-choice",
                "question": "Examine the graph below. What can you conclude?",
                "attachments": {
                    "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
                    "alt": "Sample histogram showing distribution",
                    "caption": "Histogram of student test scores"
                },
                "options": [
                    {"id": "A", "text": "The distribution is normal"},
                    {"id": "B", "text": "The distribution is skewed right"},
                    {"id": "C", "text": "The distribution is skewed left"},
                    {"id": "D", "text": "The distribution is uniform"}
                ],
                "correct_answer": "B",
                "explanation": "Based on the histogram, the distribution shows a longer tail to the right, indicating right skewness."
            }
        ]
    }
    
    print("\n=== DEMO OUTPUT JSON (snippet) ===")
    print(json.dumps(demo_output, indent=4))
    
    print("\n=== KEY FEATURES DEMONSTRATED ===")
    print("✓ Parsed allUnitsData.js and extracted quiz IDs")
    print("✓ Mapped quiz IDs to JSON filenames (1-2_q1 → ap_stats_u1_l2_quiz.json)")
    print("✓ Loaded JSON files and filtered for multiple-choice questions only")
    print("✓ Processed image attachments (converted PNG to base64 for hardcoded paths)")
    print("✓ Created structured output with unit-lesson keys (unit1-1-2, unit1-1-3)")
    print("✓ Preserved question structure with options, correct answers, and explanations")
    print("✓ Handled image attachments with base64 encoding and metadata")

if __name__ == "__main__":
    demo_script_run() 