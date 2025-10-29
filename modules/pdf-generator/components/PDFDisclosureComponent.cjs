/**
 * PDFDisclosureComponent - Auto-scaling disclosure text component
 * Intelligently adjusts font size based on content and available space
 */

const PDFComponent = require('../core/PDFComponent.cjs');

class PDFDisclosureComponent extends PDFComponent {
  /**
     * Define immutable specifications
     */
  _defineSpecs() {
    return {
      minHeight: 30,
      maxHeight: 200,
      canScale: true,
      canBreakPage: true,  // Can continue on next page if needed
      priority: -10  // Renders after main content but before signatures
    };
  }

  /**
     * Get default configuration
     */
  _getDefaultConfig() {
    return {
      // Text configuration
      text: {
        minFontSize: 7,
        maxFontSize: 10,
        defaultFontSize: 9,
        lineHeight: 1.2,
        color: '#000000',
        alignment: 'left'
      },

      // Bold text markers
      boldMarkers: {
        start: '**',
        end: '**'
      },

      // Layout
      padding: {
        top: 5,
        bottom: 3,  // Reduced from 8 to minimize gap to signature blocks
        left: 0,
        right: 0
      },

      // EXACT Energen disclosure text - DO NOT MODIFY
      defaultText: '**Note:** Taxes will be collected at the time of billing for each service. This agreement will **automatically renew each year**. An annual inflationary increase will be applied at key rates count to compensate for cost including applicable materials. Either party may cancel this agreement with a **30-day written notification** of the intent to cancel. Key services will be performed on an **annual basis** at a minimum service schedule ( M-F 8 a.m. to 5 p.m. ), Monday through Friday only. **Energen Systems Inc.** will provide the service personnel to accomplish the items set forth per the item description and quantities listed above. Please reference the contract memo for the exact job description. Service performed by **Energen Systems Inc. technicians will be documented**, and copies will be submitted for your insurance and maintenance records. **Energen Systems Inc. line technicians available 24 hours a day seven days a week** - in the event that a system failure has occurred, and diagnosis is required. Call us at **925-289-8969**, Monday through Friday, 9am-5 p.m. and a call will be dispatched to our key personnel, we will have a technician at your location no later than **three hours** after the call was received under normal circumstances. Hourly rates in use at the time will apply.'
    };
  }

  /**
     * Calculate space requirements based on text and available space
     */
  calculateSpace(doc, data) {
    const text = data.text || this.config.defaultText;
    const testFontSize = this.config.text.defaultFontSize;

    // Estimate height needed
    doc.fontSize(testFontSize);
    const estimatedLines = this._estimateLines(doc, text, 532); // Standard width
    const estimatedHeight = estimatedLines * (testFontSize * this.config.text.lineHeight);

    return {
      minHeight: this.specs.minHeight,
      preferredHeight: estimatedHeight + this.config.padding.top + this.config.padding.bottom,
      maxHeight: this.specs.maxHeight
    };
  }

  /**
     * Render disclosure with auto-scaling - EXACT Energen implementation
     */
  render(doc, bounds, data) {
    const startY = bounds.y;
    const text = data.disclosureText || data.text || this.config.defaultText;
    const availableHeight = bounds.height - this.config.padding.top - this.config.padding.bottom;

    // Dynamic width based on service count - more services = wider text block
    const serviceCount = data.serviceCount || 4;
    const baseWidth = bounds.width * 0.85; // Start with 85% of available width
    const widthAdjustment = Math.min(0.1, serviceCount * 0.01); // Add up to 10% more width for many services
    const dynamicWidth = baseWidth + (bounds.width * widthAdjustment);

    // Center the text block horizontally
    const textBlockX = bounds.x + (bounds.width - dynamicWidth) / 2;
    const availableWidth = dynamicWidth - this.config.padding.left - this.config.padding.right;

    // Calculate optimal font size based on service count
    const fontSize = this._calculateOptimalFontSize(
      doc,
      text,
      availableWidth,
      availableHeight,
      serviceCount
    );

    // PROPER SOLUTION: Custom text flow engine with manual positioning
    // Since PDFKit's continued option has a known bug with font changes,
    // we implement our own text flow that properly handles bold segments

    // Set initial position
    const textStartX = textBlockX + this.config.padding.left;
    const textStartY = startY + this.config.padding.top;

    // Set line properties
    const lineGap = fontSize * 0.15;
    const lineHeight = fontSize * 1.2;

    // Parse segments
    const segments = this._parseTextSegments(text);

    // Build word list with font information
    const words = [];
    segments.forEach(segment => {
      const segmentWords = segment.text.split(/(\s+)/); // Keep whitespace
      segmentWords.forEach(word => {
        if (word) { // Skip empty strings
          words.push({
            text: word,
            font: segment.bold ? 'Helvetica-Bold' : 'Helvetica',
            bold: segment.bold
          });
        }
      });
    });

    // Calculate line breaks with proper font measurements
    const lines = [];
    let currentLine = [];
    let currentLineWidth = 0;

    words.forEach(word => {
      // Measure word with its specific font
      doc.font(word.font).fontSize(fontSize);
      const wordWidth = doc.widthOfString(word.text);

      // Check if word fits on current line
      if (currentLineWidth + wordWidth > availableWidth && currentLine.length > 0) {
        // Save current line
        lines.push([...currentLine]);
        currentLine = [];
        currentLineWidth = 0;
      }

      // Add word to current line
      currentLine.push(word);
      currentLineWidth += wordWidth;
    });

    // Add last line
    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Render lines with proper positioning
    let currentY = textStartY;

    lines.forEach(line => {
      let currentX = textStartX;

      line.forEach(word => {
        // Skip pure whitespace at line start
        if (currentX === textStartX && word.text.trim() === '') {
          return;
        }

        // Set font for this word
        doc.font(word.font)
          .fontSize(fontSize)
          .fillColor(this.config.text.color);

        // Measure word width with correct font
        const wordWidth = doc.widthOfString(word.text);

        // CRITICAL: Must set position BEFORE text() call
        // Using x,y parameters with options can reset font
        doc.x = currentX;
        doc.y = currentY;

        // Render WITHOUT width constraint to preserve font
        doc.text(word.text, {
          lineBreak: false
        });

        // Update X position for next word
        // Use doc.x as it's been updated by text()
        currentX = doc.x;
      });

      // Move to next line
      currentY += lineHeight + lineGap;
    });

    // Get actual end position from where the document cursor ended up
    // BUT constrain it to not exceed allocated bounds
    const actualEndY = doc.y + this.config.padding.bottom;
    const maxEndY = bounds.y + bounds.height;
    const endY = Math.min(actualEndY, maxEndY);

    // Store render bounds
    this.lastRenderBounds = {
      x: bounds.x,
      y: startY,
      width: bounds.width,
      height: endY - startY
    };

    return {
      endY: endY,
      actualHeight: endY - startY,
      overflow: actualEndY > maxEndY
    };
  }

  /**
     * Calculate optimal font size based on content and space
     */
  _calculateOptimalFontSize(doc, text, width, height, serviceCount) {
    // Service count based scaling
    let baseFontSize = this.config.text.defaultFontSize;

    if (serviceCount >= 9) {
      baseFontSize = 7;
    } else if (serviceCount >= 7) {
      baseFontSize = 7.5;
    } else if (serviceCount >= 5) {
      baseFontSize = 8;
    } else {
      baseFontSize = 9;
    }

    // Test if text fits at base size
    doc.fontSize(baseFontSize);
    const lines = this._estimateLines(doc, text, width);
    const neededHeight = lines * (baseFontSize * this.config.text.lineHeight);

    if (neededHeight <= height) {
      return baseFontSize;
    }

    // Scale down if needed
    const scaleFactor = height / neededHeight;
    const scaledSize = baseFontSize * scaleFactor;

    return Math.max(
      this.config.text.minFontSize,
      Math.min(this.config.text.maxFontSize, scaledSize)
    );
  }

  /**
     * Parse text for bold segments - CORRECTED VERSION
     * Uses character-by-character parsing to properly handle ** markers
     */
  _parseTextSegments(text) {
    const segments = [];
    let currentText = '';
    let isBold = false;
    let i = 0;

    while (i < text.length) {
      // Check for bold marker (**)
      if (text.substring(i, i + 2) === '**') {
        // Save current segment if any
        if (currentText) {
          segments.push({ text: currentText, bold: isBold });
          currentText = '';
        }
        // Toggle bold state
        isBold = !isBold;
        i += 2; // Skip the ** marker
      } else {
        // Add character to current segment
        currentText += text[i];
        i++;
      }
    }

    // Add last segment if any
    if (currentText) {
      segments.push({ text: currentText, bold: isBold });
    }

    return segments;
  }

  /**
     * Estimate number of lines needed
     */
  _estimateLines(doc, text, width) {
    const words = text.split(' ');
    let lines = 1;
    let currentLineWidth = 0;

    words.forEach(word => {
      const wordWidth = doc.widthOfString(word + ' ');
      if (currentLineWidth + wordWidth > width) {
        lines++;
        currentLineWidth = wordWidth;
      } else {
        currentLineWidth += wordWidth;
      }
    });

    return lines;
  }

  /**
     * Render justified line of text
     */
  _renderJustifiedLine(doc, text, x, y, width, isLastLine) {
    if (isLastLine || !text.includes(' ')) {
      // Don't justify last line or single words
      doc.text(text, x, y);
      return;
    }

    const words = text.split(' ');
    const totalTextWidth = words.reduce((sum, word) => sum + doc.widthOfString(word), 0);
    const totalSpaceWidth = width - totalTextWidth;
    const spaceWidth = totalSpaceWidth / (words.length - 1);

    let currentX = x;
    words.forEach((word, i) => {
      doc.text(word, currentX, y);
      currentX += doc.widthOfString(word);
      if (i < words.length - 1) {
        currentX += spaceWidth;
      }
    });
  }
}

module.exports = PDFDisclosureComponent;
