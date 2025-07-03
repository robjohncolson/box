# ADR-024: AP Statistics Quiz Rendering and Conversion System

## Status
Accepted

## Context

As part of developing an AP Statistics curriculum platform, we need a robust system for:

1. **Converting PDF quiz documents to structured JSON format** with high fidelity
2. **Rendering interactive quiz content** including tables, charts, and multiple choice questions
3. **Supporting various chart types** (bar charts, pie charts, scatter plots/dotplots) with precise formatting
4. **Ensuring accessibility** across both light and dark mode interfaces
5. **Maintaining visual fidelity** to original PDF documents for educational accuracy

The system must handle complex statistical visualizations with specific requirements like custom tick intervals, axis ranges, and grid line configurations that are crucial for statistical education.

## Decision

We implemented a two-component system:

### Component 1: PDF-to-JSON Conversion Template (`prompt.rtf`)
A structured template system for LLM-assisted conversion of PDF quiz documents to JSON format.

### Component 2: Interactive Quiz Renderer (`quiz_renderer.html`)
A standalone HTML application with Chart.js integration for rendering and validating converted quiz content.

## Technical Implementation

### JSON Data Structure

```json
{
  "id": "U#-L#-Q##",
  "type": "multiple-choice", 
  "prompt": "Question text here",
  "attachments": {
    "chartType": "bar|histogram|pie|scatter|dotplot",
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
      "gridLines": true,
      "description": "Detailed chart description"
    },
    "table": [["Header1","Header2"],["data1","data2"]],
    "choices": [{"key": "A", "value": "Choice text"}]
  },
  "answerKey": "B"
}
```

### Quiz Renderer Features

#### Core Functionality
- **Multi-format JSON parsing**: Handles both legacy (`attachments.choices`) and modern (`choices` at root level) formats
- **Robust JSON sanitization**: Strips comments, handles multiple objects, validates individual components
- **Dynamic chart rendering**: Real-time Chart.js integration with custom configurations

#### Chart Support
- **Bar Charts**: Multi-series support, custom tick intervals, gaps between bars for categorical data
- **Histograms**: Continuous data visualization, no gaps between bars, custom tick intervals
- **Pie Charts**: Percentage tooltips, custom colors, legend positioning
- **Scatter Plots**: Linear scaling, custom axis ranges, point styling
- **Dotplots**: Single variable distribution, stacked dots, frequency visualization

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
2. **Content Extraction**: Questions, choices, tables, charts extracted with precise formatting
3. **JSON Generation**: Structured data following the standardized schema
4. **Validation**: Quiz renderer provides immediate visual feedback for fidelity checking
5. **Iteration**: Easy identification and correction of conversion issues

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
2. **Statistical Accuracy**: Proper distinction between bar charts (gaps) and histograms (no gaps) for AP Statistics pedagogy
3. **Immediate Validation**: Interactive renderer provides instant feedback on conversion quality
4. **Accessibility Compliance**: Dark mode and responsive design improve usability
5. **Educational Accuracy**: Precise chart controls and grid line configurations maintain statistical significance
6. **Development Efficiency**: Standalone validation tool accelerates content creation workflow
7. **Future-Proof Architecture**: Modular design enables easy integration into larger platforms

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
2. Implement server-side JSON schema validation
3. Create automated testing suite for chart rendering accuracy
4. Develop content management interface using conversion workflow
5. Add support for additional chart types (box plots, stem-and-leaf plots) as needed

## References

- Chart.js Documentation: https://www.chartjs.org/docs/latest/
- CSS Media Queries (Dark Mode): https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme
- AP Statistics Curriculum Standards: https://apcentral.collegeboard.org/courses/ap-statistics
- Web Content Accessibility Guidelines: https://www.w3.org/WAI/WCAG21/quickref/ 