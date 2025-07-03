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
    
    // For tables:
    "table": [["Header1","Header2"],["data1","data2"],...]
    
    // For bar charts (categorical data with gaps between bars):
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
      "gridLines": {
        "horizontal": true,  // Whether horizontal grid lines are shown
        "vertical": false    // Whether vertical grid lines are shown
      },
      "description": "Bar chart showing relative frequency by grade level with gaps between bars"
    }
    
    // For histograms (continuous data with NO gaps between bars):
    "chartType": "histogram",
    "xLabels": ["0-10", "10-20", "20-30", ...],  // Continuous ranges
    "series": [
      {"name": "Frequency", "values": [5, 12, 8, 3, ...]},
    ],
    "chartConfig": {
      "yAxis": {
        "min": 0,
        "max": 15,
        "tickInterval": 5,
        "title": "Frequency"
      },
      "xAxis": {
        "title": "Score Range"
      },
      "gridLines": {
        "horizontal": true,
        "vertical": false
      },
      "description": "Histogram showing score distribution with no gaps between bars"
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
    "points": [{"x": 1.2, "y": 3.4}, {"x": 2.1, "y": 4.7}, ...],
    "chartConfig": {
      "xAxis": {
        "min": 0, "max": 10, "tickInterval": 1, "title": "X Variable"
      },
      "yAxis": {
        "min": 0, "max": 10, "tickInterval": 2, "title": "Y Variable"
      },
      "gridLines": {
        "horizontal": true,
        "vertical": true
      },
      "description": "Scatter plot with specific axis ranges and tick intervals"
    }
    
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

## Critical Chart Type Identification:

### Bar Charts vs. Histograms - This Distinction is Essential for AP Statistics!

**Bar Charts (for categorical data):**
- **Visual cues**: Clear gaps/spaces between bars
- **X-axis labels**: Discrete categories (e.g., "Freshman", "Sophomore", "Junior", "Senior")
- **Data type**: Categorical variables
- **Use chartType**: "bar"

**Histograms (for continuous data):**
- **Visual cues**: NO gaps between bars - bars touch each other
- **X-axis labels**: Continuous ranges (e.g., "0-10", "10-20", "20-30")
- **Data type**: Continuous/quantitative variables
- **Use chartType**: "histogram"

### Grid Line Detection:

**Horizontal Grid Lines:**
- Look for light lines running horizontally across the chart
- These help readers align data points with y-axis values
- Usually present in most statistical charts

**Vertical Grid Lines:**
- Look for light lines running vertically down the chart
- These help readers align data points with x-axis categories/values
- Less common in most statistical charts
- More often seen in scatter plots and time series

**Important**: Many AP Statistics charts show horizontal grid lines but NOT vertical grid lines. Pay careful attention to what is actually visible in the image.

## Instructions:
- Analyze the uploaded PDF carefully
- Identify unit and lesson numbers from document headers/titles
- **Pay special attention to chart types** - look for gaps between bars to distinguish bar charts from histograms
- **Examine grid lines carefully** - note whether horizontal and/or vertical grid lines are present
- Convert each question following the exact format above
- Include all visual elements as structured data in attachments
- Preserve exact wording from the original questions
- Extract correct answers from the provided answer key/scoring guide

Create a single code artifact containing all converted questions as separate JSON objects.

## Backward Compatibility Note:
The old format `"gridLines": true` is still supported, but the new format `"gridLines": {"horizontal": true, "vertical": false}` is preferred for better precision.