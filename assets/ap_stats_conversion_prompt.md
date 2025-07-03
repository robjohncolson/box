# AP Statistics Quiz to JSON Conversion Task

You are tasked with converting AP Statistics quiz questions from uploaded PDF documents into a specific JSON format. Each question should be converted to a separate JSON object following this structure:

## JSON Format Template:
```json
{
  "id": "U#-L#-Q##",
  "type": "multiple-choice",
  "prompt": "Question text here",
  "attachments": {
    // Include visual data if present:
    // For tables: "table": [["Header1","Header2"],["data1","data2"],...]
    // For bar charts: "chartType": "bar", "xLabels": [...], "series": [{name:"Dataset 1", values:[...]}, ...]
    // For scatter plots: "chartType": "scatter", "points": [{x:__, y:__}, ...]
    
    "choices": [
      { "key": "A", "value": "Choice A text" },
      { "key": "B", "value": "Choice B text" },
      { "key": "C", "value": "Choice C text" },
      { "key": "D", "value": "Choice D text" },
      { "key": "E", "value": "Choice E text" }
    ]
  },
  "answerKey": "B"
}
```

## Key Requirements:
1. **ID Format**: Use pattern "U#-L#-Q##" where # represents unit, lesson, and question numbers
2. **Visual Data**: Extract and format any tables, charts, or graphs according to the specifications above
3. **Clean Prompts**: Remove table formatting from prompt text when table data is included in attachments
4. **Answer Keys**: Include the correct answer from the scoring guide
5. **Complete Output**: Provide all questions as separate JSON objects in a single code artifact

## Instructions:
- Analyze the uploaded PDF
- Identify unit and lesson numbers from document headers/titles
- Convert each question following the exact format above
- Include all visual elements as structured data in attachments
- Preserve exact wording from the original questions
- Extract correct answers from the provided answer key/scoring guide

Create a single code artifact containing all converted questions as separate JSON objects.