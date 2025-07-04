# ADR-024: AP Statistics Quiz Rendering and Conversion System

## Status
Accepted - Enhanced (Multiple Chart Support Added)

## Context

As part of developing an AP Statistics curriculum platform, we need a robust system for:

1. **Converting PDF quiz documents to structured JSON format** with high fidelity
2. **Rendering interactive quiz content** including tables, charts, and multiple choice questions
3. **Supporting various chart types** (bar charts, histograms, pie charts, scatter plots, dotplots, boxplots) with precise formatting
4. **Ensuring accessibility** across both light and dark mode interfaces
5. **Maintaining visual fidelity** to original PDF documents for educational accuracy

The system must handle complex statistical visualizations with specific requirements like custom tick intervals, axis ranges, and grid line configurations that are crucial for statistical education.

**Recent Enhancements (2024)**: Added support for multiple chart rendering scenarios including comparative boxplots (multiple boxplots in same chart space) and separate histogram layouts (side-by-side histograms using `charts[]` array structure). This addresses the need for proper statistical comparison visualizations commonly found in AP Statistics curriculum.

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
  "answerKey": "B"
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

#### Multiple Boxplots Format (NEW)
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
          "Q1": 2.5, "Q3": 5.0, "median": 3.5, "min": 1.5, "max": 7.5
        },
        {
          "name": "League B", 
          "Q1": 2.5, "Q3": 5.0, "median": 4.0, "min": 0.5, "max": 12.0
        }
      ],
      "gridLines": {"horizontal": false, "vertical": false}
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

#### Chart Support
- **Bar Charts**: Multi-series support, custom tick intervals, gaps between bars for categorical data
- **Histograms**: Continuous data visualization, no gaps between bars, custom tick intervals
  - **Overlaid histograms**: Multiple series in same chart space for comparison
  - **Separate histograms**: Side-by-side charts using `charts` array structure
- **Pie Charts**: Percentage tooltips, custom colors, legend positioning
- **Scatter Plots**: Linear scaling, custom axis ranges, point styling
- **Dotplots**: Single variable distribution, stacked dots, frequency visualization
- **Boxplots**: Five-number summary visualization, outlier detection, IQR analysis
  - **Single boxplots**: Traditional single-group analysis
  - **Multiple boxplots**: Comparative analysis with multiple groups in same chart space

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

#### Dark Mode Support
- **Automatic detection**: Uses `prefers-color-scheme: dark` media query
- **Dynamic color adaptation**: 
  - Light mode: `#36A2EB` (dark blue)
  - Dark mode: `#5BC0EB` (bright blue)
- **Real-time switching**: Charts re-render when system theme changes
- **Comprehensive theming**: UI elements, tables, forms, and charts all adapt

#### Accessibility Features
- **High contrast ratios** in both light and dark modes
- **Keyboard navigation** support
- **Screen reader compatibility** with semantic HTML structure
- **Responsive design** for various screen sizes

### Conversion Workflow

1. **PDF Analysis**: LLM identifies unit/lesson numbers, question structure, visual elements
2. **Visual Element Classification**: 
   - Distinguish bar charts (gaps) vs histograms (no gaps)
   - Identify single vs multiple boxplots in comparative scenarios
   - Determine overlaid vs separate chart layouts
3. **Content Extraction**: Questions, choices, tables, charts extracted with precise formatting
4. **Chart Strategy Selection**:
   - **Overlaid charts**: Multiple series in same chart space for direct comparison
   - **Separate charts**: Individual charts using `charts[]` array for different scales/contexts
   - **Multiple boxplots**: Array of boxplot objects for group comparisons
5. **JSON Generation**: Structured data following the standardized schema with appropriate format
6. **Validation**: Quiz renderer provides immediate visual feedback for fidelity checking
7. **Iteration**: Easy identification and correction of conversion issues

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
3. **Flexible Chart Layouts**: Support for both overlaid and separate chart configurations based on educational context
4. **Comparative Analysis Support**: Multiple boxplots and side-by-side histograms enable proper statistical comparisons
5. **Immediate Validation**: Interactive renderer provides instant feedback on conversion quality
6. **Accessibility Compliance**: Dark mode and responsive design improve usability
7. **Educational Accuracy**: Precise chart controls and grid line configurations maintain statistical significance
8. **Development Efficiency**: Standalone validation tool accelerates content creation workflow
9. **Future-Proof Architecture**: Modular design enables easy integration into larger platforms
10. **Responsive Design**: Multiple chart layouts adapt to different screen sizes and orientations

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
1. Extract chart rendering logic into modular JavaScript components
2. Implement server-side JSON schema validation with multiple chart format support
3. Create automated testing suite for chart rendering accuracy including multiple chart scenarios
4. Develop content management interface using conversion workflow with chart strategy selection
5. Add support for additional chart types (stem-and-leaf plots, two-way tables) as needed
6. Implement chart layout optimization for mobile devices
7. Add support for mixed chart types within the same `charts[]` array

## References

- Chart.js Documentation: https://www.chartjs.org/docs/latest/
- CSS Media Queries (Dark Mode): https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- AP Statistics Curriculum Standards: https://apcentral.collegeboard.org/courses/ap-statistics
- Web Content Accessibility Guidelines: https://www.w3.org/WAI/WCAG21/quickref/ 