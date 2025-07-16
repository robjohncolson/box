# ADR-024: AP Statistics Quiz Rendering and Conversion System

## Status
Accepted - Enhanced (Horizontal Bar Charts, Audio Feedback, and Advanced Chart Configuration Added)

## Context

As part of developing an AP Statistics curriculum platform, we need a robust system for:

1. **Converting PDF quiz documents to structured JSON format** with high fidelity
2. **Rendering interactive quiz content** including tables, charts, and multiple choice questions
3. **Supporting various chart types** (bar charts, histograms, pie charts, scatter plots, dotplots, boxplots) with precise formatting
4. **Ensuring accessibility** across both light and dark mode interfaces
5. **Maintaining visual fidelity** to original PDF documents for educational accuracy

The system must handle complex statistical visualizations with specific requirements like custom tick intervals, axis ranges, and grid line configurations that are crucial for statistical education.

**Recent Enhancements (2024)**: 
- **Horizontal Bar Chart Support**: Added full support for horizontal bar charts with proper axis configuration and orientation detection
- **Audio Feedback System**: Implemented synthesized audio feedback for user interactions using Web Audio API
- **Advanced Chart Configuration**: Enhanced chart configuration with precise outlier handling for boxplots, improved grid line controls, and better axis labeling
- **Theme System**: Added manual theme switching with localStorage persistence alongside automatic dark mode detection
- **Interactive Editing**: Drag-to-edit histogram bars and dotplot points using **chartjs-plugin-dragdata** (mouse *and* touch). Includes real-time value tool-tips, automatic restacking, and JSON persistence for export.
- **Dotplot Add / Remove**: Double-click to add a new dot at the clicked x-value or remove an existing dot; display restacks and y-axis rescales automatically.
- **Modification Tracking & Export**: Changes flag questions as *Modified*, enable one-click export of the updated JSON, and support reset to the original state.
- **Multiple Chart Rendering**: Support for comparative boxplots and separate histogram layouts using `charts[]` array structure
- **Enhanced Free Response Solutions**: Complete solution rendering with scoring rubrics, calculations, and solution-specific visualizations
- **Floating Context Finder Overlay**: Fixed overlay displays the currently-visible question's number and ID during scrolling for improved navigation.
- **High-Contrast Choice Hover Highlight**: Answer choice hover now uses a yellow background (light `#fff9c4`, dark `#665c00`) to avoid confusion with the green correct-answer indicator.
- **Audio System Upgrade**: Randomized melodic success/error tones and global volume control provide richer, balanced feedback.
- **Point Labeling via Chart.js DataLabels**: Integrated the official **chartjs-plugin-datalabels** for automatic point labels on scatter and dotplot charts (and optional labels for bar/histogram/pie). This replaces the custom inline label renderer for greater stability and customization.

These enhancements address the need for proper statistical comparison visualizations, improved user experience, and comprehensive educational content rendering commonly found in AP Statistics curriculum.

## Decision

We implemented a two-component system:

### Component 1: PDF-to-JSON Conversion Template (`prompt.rtf`)
A structured template system for LLM-assisted conversion of PDF quiz documents to JSON format.

### Component 2: Interactive Quiz Renderer (`quiz_renderer.html`)
A standalone HTML application with Chart.js integration for rendering and validating converted quiz content.

## Technical Implementation

### JSON Data Structure

#### Single Chart Format
```json
{
  "id": "U#-L#-Q##",
  "type": "multiple-choice", 
  "prompt": "Question text here",
  "attachments": {
    "chartType": "bar|histogram|pie|scatter|dotplot|boxplot",
    "xLabels": ["Category1", "Category2", "Category3"],
    "series": [
      {"name": "Dataset 1", "values": [0.1, 0.2, 0.3]},
      {"name": "Dataset 2", "values": [0.15, 0.25, 0.35]}
    ],
    "chartConfig": {
      "yAxis": {
        "min": 0,
        "max": 1.0,
        "tickInterval": 0.25,
        "title": "Axis Label"
      },
      "xAxis": {
        "title": "Category"
      },
      "gridLines": {
        "horizontal": true,
        "vertical": false
      },
      "description": "Detailed chart description"
    },
    "table": [["Header1","Header2"],["data1","data2"]],
    "choices": [{"key": "A", "value": "Choice text"}]
  },
  "answerKey": "B",
  "reasoning": "Detailed explanation of why the correct answer is correct"
}
```

#### Multiple Charts Format (NEW)
```json
{
  "id": "U#-L#-Q##",
  "type": "multiple-choice",
  "prompt": "Question text here", 
  "attachments": {
    "charts": [
      {
        "chartType": "histogram",
        "title": "Earthquake Disturbances",
        "series": [{"name": "Earthquake", "values": [...]}],
        "chartConfig": {
          "yAxis": {"min": 0, "max": 0.4, "tickInterval": 0.05},
          "xAxis": {"title": "Time", "labelType": "upperBound"},
          "gridLines": {"horizontal": true, "vertical": false}
        }
      },
      {
        "chartType": "histogram", 
        "title": "Mining Disturbances",
        "series": [{"name": "Mining", "values": [...]}],
        "chartConfig": {
          "yAxis": {"min": 0, "max": 0.4, "tickInterval": 0.05},
          "xAxis": {"title": "Time", "labelType": "upperBound"}, 
          "gridLines": {"horizontal": true, "vertical": false}
        }
      }
    ],
    "description": "Overall comparison description"
  },
  "choices": [{"key": "A", "value": "Choice text"}],
  "answerKey": "B"
}
```

#### Horizontal Bar Chart Format (NEW)
```json
{
  "id": "U1-PC-MCQ-A-Q11",
  "type": "multiple-choice",
  "prompt": "Question text here",
  "attachments": {
    "chartType": "bar",
    "yLabels": ["Language Arts", "Math", "Science", "Social Studies", "Art"],
    "series": [
      {"name": "Grade 7", "values": [25, 30, 55, 15, 5]},
      {"name": "Grade 8", "values": [35, 20, 40, 25, 16]}
    ],
    "chartConfig": {
      "orientation": "horizontal",
      "xAxis": {
        "min": 0, "max": 60, "tickInterval": 10,
        "title": "Number of Students"
      },
      "yAxis": {"title": "School Subject"},
      "gridLines": {"horizontal": true, "vertical": false},
      "description": "Horizontal bar chart showing favorite school subjects by grade level"
    }
  },
  "choices": [{"key": "A", "value": "Choice text"}],
  "answerKey": "A"
}
```

#### Enhanced Boxplot Format with Outlier Handling (NEW)
```json
{
  "attachments": {
    "chartType": "boxplot",
    "chartConfig": {
      "orientation": "horizontal",
      "xAxis": {"min": 0, "max": 12.5, "tickInterval": 2.5, "title": "ERA"},
      "boxplotData": [
        {
          "name": "League A",
          "Q1": 2.5, "Q3": 5.0, "median": 3.5, 
          "whiskerMin": 1.5, "whiskerMax": 7.5,
          "outliers": [0.8, 10.2]
        },
        {
          "name": "League B", 
          "Q1": 2.5, "Q3": 5.0, "median": 4.0,
          "whiskerMin": 1.2, "whiskerMax": 8.5,
          "outliers": [0.4, 12.0]
        }
      ],
      "gridLines": {"horizontal": false, "vertical": false},
      "description": "Boxplots comparing ERA with explicit outlier handling"
    }
  }
}
```

#### Free Response with Solution Visualizations (NEW)
```json
{
  "id": "U1-PC-FRQ-Q01",
  "type": "free-response",
  "prompt": "Multi-part question text with (a), (b), (c) parts",
  "attachments": {
    "table": [["Header1","Header2"],["data1","data2"]]
  },
  "solution": {
    "parts": [
      {
        "partId": "a-i",
        "description": "Create a histogram showing the distribution",
        "response": "Complete solution explanation",
        "attachments": {
          "chartType": "histogram",
          "xLabels": ["0-5", "5-10", "10-15", "15-20"],
          "series": [{"name": "Frequency", "values": [8, 14, 25, 27]}],
          "chartConfig": {
            "yAxis": {"min": 0, "max": 30, "tickInterval": 5, "title": "Frequency"},
            "xAxis": {"title": "Amounts (dollars)", "labelType": "range"},
            "gridLines": {"horizontal": true, "vertical": false}
          }
        },
        "calculations": [
          "Total values: 91",
          "Median position: (91+1)/2 = 46th value"
        ]
      }
    ],
    "scoring": {
      "totalPoints": 4,
      "rubric": [
        {
          "part": "a-i", "maxPoints": 2,
          "criteria": ["Correct histogram structure", "Proper axis labeling"],
          "scoringNotes": "Essentially correct (E) if all components present"
        }
      ]
    }
  }
}
```

### Quiz Renderer Features

#### Core Functionality
- **Multi-format JSON parsing**: Handles both legacy (`attachments.choices`) and modern (`choices` at root level) formats
- **Robust JSON sanitization**: Strips comments, handles multiple objects, validates individual components
- **Dynamic chart rendering**: Real-time Chart.js integration with custom configurations
- **Multiple chart support**: Side-by-side rendering of multiple charts using `attachments.charts[]` array
- **Flexible chart layouts**: Responsive flexbox layout for multiple charts with automatic sizing
- **Interactive UI controls**: File upload, JSON text input, theme switching, and audio toggle
- **Real-time statistics**: Live count of questions, chart types, and content features
- **Comprehensive free response rendering**: Complete solution display with scoring rubrics and calculations

#### Chart Support (2024)
• **Bar Charts** — Multi-series, vertical & horizontal; draggable **histogram** variant for live editing.

• **Histograms** — Gap-less bars, overlaid or separate layouts, integer rounding, **drag-to-edit bar heights**, JSON sync.

• **Pie Charts** — Percentage tool-tips, color-blind-friendly palettes, legend positioning.

• **Scatter Plots** — Linear scaling, custom axis ranges, point styling, **optional least-squares regression line**, dashed y = 0 reference line support, and **automatic point labels** via Chart.js DataLabels plugin.

• **Dotplots** — Stacked frequency dots with **drag-to-edit** x-position and **double-click add/remove**; automatic restack & axis rescale, configurable **dot radius**, and **optional point labels** (counts or explicit labels) powered by DataLabels.

• **Boxplots** — Single or multiple, horizontal or vertical, whisker & outlier support with exact five-number summaries.

• **Normal Distribution Curves** — Dynamically generated bell curves for any mean \(\mu\) and standard deviation \(\sigma\) with optional shaded regions for tail/interval probabilities; axis limits and tick spacing fully configurable.

• **Chi-Square Distribution Curves** — Right-skewed \(\chi^2\) PDFs rendered for one or many degrees of freedom; supports overlaying multiple curves with custom labels, precise axis limits, and grid line controls.

• **Number Line Diagrams** — Baseline with arrow-heads, custom ticks, and separate top/bottom labels to illustrate intervals or sampling distributions (e.g., \(\bar{x} \pm ks\)); tick visibility and labeling fully configurable via `ticks[]` array.

#### Advanced Chart Configuration
```javascript
"chartConfig": {
  "yAxis": {
    "tickInterval": 0.25,  // Precise tick spacing
    "min": 0, "max": 1.0   // Exact axis ranges
  },
  "gridLines": {
    "horizontal": true,    // Horizontal grid lines
    "vertical": false      // Vertical grid lines
  },
  "description": "..."     // Contextual information
}
```

#### Enhanced UI Features

##### Audio Feedback System
- **Synthesized Audio**: Web Audio API integration for real-time sound feedback
- **Contextual Tones**: Different tones for different actions (load, clear, success, error, theme switch)
- **Musical Chords**: Complex chord progressions for theme changes and successful operations
- **User Control**: Toggle audio on/off with localStorage persistence
- **Accessibility**: Non-intrusive audio cues to enhance user experience
- **Randomized Melodic Variations**: Success and error sounds pick random notes for a less repetitive, more engaging tone palette.
- **Global Volume Control**: Master gain node manages overall loudness and enables future audio scaling.

##### Theme System
- **Dual Theme Support**: Manual theme switching alongside automatic detection
- **localStorage Persistence**: User theme preferences saved across sessions
- **Dynamic color adaptation**: 
  - Light mode: `#36A2EB` (dark blue)
  - Dark mode: `#5BC0EB` (bright blue)
- **Real-time chart re-rendering**: Charts automatically update when theme changes
- **Comprehensive theming**: UI elements, tables, forms, and charts all adapt

##### Interaction Enhancements
- **Floating Context Finder**: A fixed overlay in the top-right corner continuously shows the question currently in view, aiding orientation in long quizzes.
- **High-Contrast Hover States**: Multiple-choice options highlight in yellow on hover (light & dark theme variants) to clearly distinguish from correct-answer green.

#### Accessibility Features
- **High contrast ratios** in both light and dark modes
- **Keyboard navigation** support
- **Screen reader compatibility** with semantic HTML structure
- **Responsive design** for various screen sizes

### Conversion Workflow

1. **PDF Analysis**: LLM identifies unit/lesson numbers, question structure, visual elements
2. **Visual Element Classification**: 
   - Distinguish bar charts (gaps) vs histograms (no gaps)
   - **Bar chart orientation detection**: Vertical (standard) vs horizontal bar charts
   - Identify single vs multiple boxplots in comparative scenarios
   - Determine overlaid vs separate chart layouts
   - **Precise outlier identification**: Visual detection of outlier points beyond whiskers
3. **Content Extraction**: Questions, choices, tables, charts extracted with precise formatting
4. **Chart Strategy Selection**:
   - **Overlaid charts**: Multiple series in same chart space for direct comparison
   - **Separate charts**: Individual charts using `charts[]` array for different scales/contexts
   - **Multiple boxplots**: Array of boxplot objects for group comparisons
   - **Horizontal bar charts**: Use `yLabels` and `orientation: "horizontal"` for proper rendering
5. **JSON Generation**: Structured data following the standardized schema with appropriate format
6. **Validation**: Quiz renderer provides immediate visual and audio feedback for fidelity checking
7. **Iteration**: Easy identification and correction of conversion issues with enhanced debugging tools

## Rationale

### Technology Choices

**Chart.js over D3.js/Custom Solutions**:
- Mature, well-documented library with extensive chart type support
- Built-in responsive design and accessibility features
- Easy integration with existing web technologies
- Strong community support and regular updates

**Standalone HTML Application**:
- Zero external dependencies beyond Chart.js CDN
- Easy deployment and sharing for validation purposes
- Works offline for secure educational content review
- Simple integration path into larger applications

**CSS Media Queries for Dark Mode**:
- Native browser support without JavaScript dependencies
- Automatic system preference detection
- Smooth transitions between themes
- Future-proof approach aligned with web standards

### Data Structure Design

**Flexible Chart Configuration**:
- Detailed `chartConfig` objects allow precise control over visual elements
- Supports statistical education requirements (exact tick intervals, axis ranges)
- Extensible for future chart types and configurations
- Maintains backward compatibility with simpler chart definitions

**Dual Choice Format Support**:
- Accommodates both legacy and modern JSON structures
- Enables gradual migration of existing content
- Reduces conversion friction for different source formats

## Consequences

### Benefits

1. **High Fidelity Conversion**: Detailed chart configurations ensure visual accuracy to original PDFs
2. **Statistical Accuracy**: Proper distinction between bar charts (gaps), histograms (no gaps), dotplots (stacked dots), and boxplots (five-number summary) for AP Statistics pedagogy
3. **Comprehensive Chart Support**: Vertical and horizontal bar charts, enhanced boxplots with precise outlier handling
4. **Flexible Chart Layouts**: Support for both overlaid and separate chart configurations based on educational context
5. **Comparative Analysis Support**: Multiple boxplots and side-by-side histograms enable proper statistical comparisons
6. **Enhanced User Experience**: Audio feedback system with synthesized tones for interactive validation
7. **Immediate Validation**: Interactive renderer provides instant visual and audio feedback on conversion quality
8. **Accessibility Compliance**: Dark mode, responsive design, and audio feedback improve usability
9. **Educational Accuracy**: Precise chart controls and grid line configurations maintain statistical significance
10. **Development Efficiency**: Standalone validation tool with enhanced debugging features accelerates content creation workflow
11. **Future-Proof Architecture**: Modular design enables easy integration into larger platforms
12. **Responsive Design**: Multiple chart layouts adapt to different screen sizes and orientations
13. **Complete Solution Rendering**: Free response questions with scoring rubrics, calculations, and solution visualizations
14. **Persistent User Preferences**: Theme and audio settings saved across sessions for consistent user experience

### Trade-offs

1. **Chart.js Dependency**: Introduces external library dependency, though CDN-based reduces impact
2. **Client-Side Processing**: JSON parsing and chart rendering happen in browser, requiring JavaScript
3. **Limited Offline Functionality**: CDN dependency requires internet connection for Chart.js
4. **Maintenance Overhead**: Need to track Chart.js updates and API changes

### Risks and Mitigations

**Risk**: Chart.js API changes breaking compatibility
**Mitigation**: Version pinning to stable releases, regular testing with new versions

**Risk**: Dark mode implementation inconsistencies across browsers
**Mitigation**: Progressive enhancement approach, fallback to light mode

**Risk**: Complex chart configurations becoming unmaintainable
**Mitigation**: Clear documentation, schema validation, standardized patterns

## Integration Path

### Main Application Integration
1. **JSON Schema Validation**: Implement server-side validation using the established format
2. **Chart Rendering Components**: Extract Chart.js integration patterns into reusable components
3. **Theme System**: Incorporate dark mode patterns into application-wide design system
4. **Content Management**: Use conversion workflow for curriculum content creation pipeline

### Recommended Next Steps
1. Extract chart rendering logic into modular JavaScript components with horizontal bar chart support
2. Implement server-side JSON schema validation with multiple chart format support including new outlier handling
3. Create automated testing suite for chart rendering accuracy including horizontal bar charts and enhanced boxplots
4. Develop content management interface using conversion workflow with chart strategy and orientation selection
5. Add support for additional chart types (stem-and-leaf plots, two-way tables) as needed
6. Implement chart layout optimization for mobile devices with audio feedback integration
7. Add support for mixed chart types within the same `charts[]` array
8. **Audio System Enhancement**: Expand audio feedback with customizable tone patterns and accessibility compliance
9. **Advanced Theme System**: Add more theme options and better contrast controls for educational accessibility
10. **Enhanced Free Response Support**: Expand solution rendering with interactive elements and step-by-step calculations
11. **Outlier Analysis Tools**: Add interactive outlier identification and IQR calculation displays
12. **Chart Export Functionality**: Enable export of rendered charts for educational materials and presentations

## References

- Chart.js Documentation: https://www.chartjs.org/docs/latest/
- CSS Media Queries (Dark Mode): https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- AP Statistics Curriculum Standards: https://apcentral.collegeboard.org/courses/ap-statistics
- Web Content Accessibility Guidelines: https://www.w3.org/WAI/WCAG21/quickref/
- Chart.js Horizontal Bar Charts: https://www.chartjs.org/docs/latest/charts/bar.html#horizontal-bar-chart 