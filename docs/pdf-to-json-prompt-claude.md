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
    "xLabels": ["0-10", "10-20", "20-30", ...],  // Use ranges if PDF shows "0-10, 10-20, 20-30"
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
        "title": "Score Range",
        "labelType": "range"  // Use "range" when PDF shows "0-10, 10-20, 20-30"
      },
      "gridLines": {
        "horizontal": false,  // CAREFULLY observe - many histograms have NO grid lines
        "vertical": false
      },
      "description": "Histogram showing score distribution with no gaps between bars"
    }
    
    // Alternative histogram format (when PDF shows upper bounds like "200, 400, 600"):
    "chartType": "histogram",
    "xLabels": ["200", "400", "600", "800", "1000", "1200"],  // Single values when PDF shows upper bounds
    "series": [
      {"name": "Number of Students", "values": [4, 6, 9, 7, 3, 1]},
    ],
    "chartConfig": {
      "yAxis": {
        "min": 0,
        "max": 10,
        "tickInterval": 1,
        "title": "Number of Students"
      },
      "xAxis": {
        "title": "Amount Spent (Dollars)",
        "labelType": "upperBound",  // Use "upperBound" when PDF shows single values like "200, 400, 600"
        "labels": [200, 400, 600, 800, 1000, 1200]  // Numeric values for precise labeling
      },
      "gridLines": {
        "horizontal": false,  // CAREFULLY observe - many histograms have NO grid lines
        "vertical": false
      },
      "description": "Histogram showing spending distribution with upper bound labels"
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
    
    // For dotplots (distribution of single variable):
    "chartType": "dotplot",
    "values": [55, 60, 60, 60, 60, 65, 65, 65, 70, 70, 70, 75, 75, 80, 85, 90, 95],
    "chartConfig": {
      "xAxis": {
        "min": 50, "max": 100, "tickInterval": 5, "title": "Score"
      },
      "gridLines": {
        "horizontal": false,
        "vertical": false
      },
      "description": "Dotplot showing distribution of scores with dots stacked vertically"
    }
    
    // For boxplots (five-number summary visualization):
    "chartType": "boxplot",
    "chartConfig": {
      "orientation": "horizontal",  // "horizontal" or "vertical" - controls boxplot orientation
      "xAxis": {
        "min": 28, "max": 44, "tickInterval": 2, "title": "Tree Height (inches)"
      },
      "boxplotData": {
        "Q1": 32,
        "Q3": 38,
        "median": 35,
        "min": 30,
        "max": 42
      },
      "gridLines": {
        "horizontal": false,
        "vertical": false
      },
      "description": "Boxplot showing the heights of a sample of 100 trees growing on a tree farm"
    }
    
    // For MULTIPLE boxplots in the same chart (comparative boxplots):
    "chartType": "boxplot",
    "chartConfig": {
      "orientation": "horizontal",  // "horizontal" or "vertical" - controls boxplot orientation
      "xAxis": {
        "min": 0, "max": 12.5, "tickInterval": 2.5, "title": "ERA"
      },
      "boxplotData": [
        {
          "name": "League A",
          "Q1": 2.5,
          "Q3": 5.0,
          "median": 3.5,
          "min": 1.5,
          "max": 7.5
        },
        {
          "name": "League B",
          "Q1": 2.5,
          "Q3": 5.0,
          "median": 4.0,
          "min": 0.5,
          "max": 12.0
        }
      ],
      "gridLines": {
        "horizontal": false,
        "vertical": false
      },
      "description": "Boxplots comparing ERA for pitchers in leagues A and B"
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
- **X-axis labels**: Can be either:
  - **Ranges**: "0-10", "10-20", "20-30" (use `labelType: "range"`)
  - **Upper bounds**: "200", "400", "600" (use `labelType: "upperBound"`)
  - **Lower bounds**: "0, 10, 20" (use `labelType: "lowerBound"`)
- **Grid lines**: Often NO grid lines - observe carefully!
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

**Dotplots (for single variable distribution):**
- **Visual cues**: Dots stacked vertically at each value, showing frequency
- **X-axis**: Shows the variable values (continuous scale)
- **Y-axis**: No explicit labels - height represents frequency/count
- **Data type**: Single quantitative variable
- **Use chartType**: "dotplot"

**Scatter Plots (for two variable relationships):**
- **Visual cues**: Dots scattered across both dimensions
- **X-axis**: One quantitative variable
- **Y-axis**: Another quantitative variable with explicit labels
- **Data type**: Two quantitative variables showing relationship
- **Use chartType**: "scatter"

**Boxplots (for five-number summary visualization):**
- **Visual cues**: Rectangular box with whiskers extending from both ends
- **Components**: Box (Q1 to Q3), median line inside box, whiskers (to min/max or fences), possible outlier points
- **Purpose**: Shows distribution shape, spread, and identifies outliers
- **Data needed**: Five-number summary (min, Q1, median, Q3, max)
- **Orientation**: 
  - **Horizontal**: Box extends left-right, values on x-axis (use `"orientation": "horizontal"`)
  - **Vertical**: Box extends up-down, values on y-axis (use `"orientation": "vertical"`)
- **Multiple boxplots**: When comparing groups, use an array of boxplot objects in `boxplotData`
- **Use chartType**: "boxplot"

## Multiple Charts Strategy:

**Overlaid Histograms (same chart, different colors):**
- Use when comparing distributions side-by-side
- Both distributions use the same x-axis scale
- Good for showing relative differences
- Use multiple series in the same histogram JSON

**Separate Histograms (different charts):**
- Use when distributions have very different scales
- When the question explicitly shows them as separate charts
- Use the `charts` array structure within attachments
- Each histogram gets its own chart space and title

Example of separate histograms:
```json
"attachments": {
  "charts": [
    {
      "chartType": "histogram",
      "title": "Earthquake Disturbances",
      "xLabels": ["0.2", "0.4", "0.6", "0.8"],
      "series": [
        {"name": "Earthquake Disturbances", "values": [0.35, 0.20, 0.10, 0.10]}
      ],
      "chartConfig": {
        "yAxis": {"min": 0.0, "max": 0.40, "tickInterval": 0.05, "title": "Relative Frequency"},
        "xAxis": {"title": "Root Mean Square Time", "labelType": "upperBound"},
        "gridLines": {"horizontal": true, "vertical": false}
      }
    },
    {
      "chartType": "histogram", 
      "title": "Mining Disturbances",
      "xLabels": ["0.2", "0.4", "0.6", "0.8"],
      "series": [
        {"name": "Mining Disturbances", "values": [0.0, 0.22, 0.35, 0.25]}
      ],
      "chartConfig": {
        "yAxis": {"min": 0.0, "max": 0.40, "tickInterval": 0.05, "title": "Relative Frequency"},
        "xAxis": {"title": "Root Mean Square Time", "labelType": "upperBound"},
        "gridLines": {"horizontal": true, "vertical": false}
      }
    }
  ],
  "description": "Overall description of the multiple charts"
}
```

**Multiple Boxplots (same chart space):**
- Use when comparing groups (e.g., "League A vs League B")
- Put multiple boxplot objects in the `boxplotData` array
- Each boxplot gets its own name and color
- The renderer will space them appropriately

## Instructions:
- Analyze the uploaded PDF carefully
- Identify unit and lesson numbers from document headers/titles
- **Pay special attention to chart types** - look for gaps between bars to distinguish bar charts from histograms
- **Look for stacked dots** - identify dotplots showing single variable distributions vs scatter plots showing two-variable relationships
- **Identify boxplots** - look for rectangular boxes with whiskers, median lines, and possible outlier points
- **Examine grid lines carefully** - note whether horizontal and/or vertical grid lines are present
- **For histograms, observe x-axis labels precisely**:
  - If PDF shows "0-10, 10-20, 20-30" → use range labels with `labelType: "range"`
  - If PDF shows "200, 400, 600" → use upper bound labels with `labelType: "upperBound"`
  - If PDF shows "0, 10, 20" → use lower bound labels with `labelType: "lowerBound"`
- **For boxplots, extract the five-number summary** - identify min, Q1, median, Q3, max values from the visual
- **Grid line detection is critical** - many AP Statistics charts have NO grid lines at all
- Convert each question following the exact format above
- Include all visual elements as structured data in attachments
- Preserve exact wording from the original questions
- Extract correct answers from the provided answer key/scoring guide

Create a single code artifact containing all converted questions as separate JSON objects.

## Backward Compatibility Note:
- The old format `"gridLines": true` is still supported, but the new format `"gridLines": {"horizontal": true, "vertical": false}` is preferred for better precision.
- For histograms, the new `"labelType"` field enables precise x-axis labeling: use `"range"` for interval labels, `"upperBound"` for boundary labels, or `"lowerBound"` for lower bound labels.
- Boxplots use the `"boxplotData"` structure to store the five-number summary for accurate statistical visualization.