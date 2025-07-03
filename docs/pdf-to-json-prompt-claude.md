# AP Statistics Quiz to JSON Conversion Task

You are tasked with converting AP Statistics quiz questions from uploaded PDF documents into a specific JSON format. Each question should be converted to a separate JSON object following this structure:
##
## JSON Format Template:
```json
{
  "id": "U#-L#-Q##",
  "type": "multiple-choice",
  "prompt": "Question text here",
  "attachments": {
    // Include visual data if present:
    
    // For tables:
    "table": [["Header1","Header2"],["data1","data2"],...]
    
    // For bar charts:
    "chartType": "bar",
    "xLabels": ["Category1", "Category2", ...],
    "series": [
      {"name": "Dataset 1", "values": [0.1, 0.2, 0.3, ...]},
      {"name": "Dataset 2", "values": [0.15, 0.25, 0.35, ...]}
    ],
    "chartConfig": {
      "yAxis": {
        "min": 0,           // Minimum value on y-axis
        "max": 1.0,         // Maximum value on y-axis (if specified)
        "tickInterval": 0.25, // Step size between tick marks (e.g., 0.1, 0.25, 0.5)
        "title": "Relative Frequency" // Y-axis label
      },
      "xAxis": {
        "title": "Grade"    // X-axis label
      },
      "gridLines": true,    // Whether horizontal grid lines are shown
      "description": "Bar chart showing relative frequency by grade level with tick marks every 0.25"
    }
    
    // For pie charts:
    "chartType": "pie",
    "series": [
      {
        "name": "Category Distribution",
        "values": [
          {"name": "Weather", "value": 70},
          {"name": "Overbooking", "value": 15},
          {"name": "Other", "value": 8}
        ]
      }
    ],
    "chartConfig": {
      "showPercentages": true,  // Whether percentages are displayed
      "showValues": true,       // Whether raw values are shown
      "description": "Pie chart showing flight delay reasons with percentages"
    }
    
    // For scatter plots:
    "chartType": "scatter",
    "points": [{"x"