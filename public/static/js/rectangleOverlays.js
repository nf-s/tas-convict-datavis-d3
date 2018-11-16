/* eslint-disable class-methods-use-this */
const defaultTransitionDuration = 500;
const defaultTextTransitionDuration = 250;

const popupPadding = 15;
const popupWidth = 400;
const popupHeight = 600;

const minRectangleLabelHeight = 15;

class RectangleOverlays {
  constructor(allData, visibleData, touchEvts) {
    this.allData = allData;
    this.visibleData = visibleData;
    this.touchEvts = touchEvts;
  }

  createRectLabel(d, x1, x2, y, currentZoomTransform) {
    if (typeof d.visible === 'undefined' || !d.visible) {
      const rowLabel = {};

      rowLabel.g = overlaySvg.append('g')
        .attr('opacity', 0)
        .attr('class', 'row-label');

      rowLabel.rect = rowLabel.g.append('rect')
        .style('fill', d.colour)
        .style('stroke-width', '0px')
        .attr('opacity', 0);

      rowLabel.setRectPointerEvents = () => {
        rowLabel.rect
          .on('pointerover', this.onMouseOver(rowLabel))
          .on('pointerout', this.onMouseOut(rowLabel))
          .on('click', this.onClick(rowLabel, d))
          .on('pointerdown', () => this.touchEvts.pointerDownHandler(d3.event))
          .on('pointermove', () => this.touchEvts.pointerMoveHandler(d3.event))
          .on('pointerup', () => this.touchEvts.pointerUpHandler(d3.event))
          .on('pointercancel', () => this.touchEvts.pointerUpHandler(d3.event))
          .on('pointerleave', () => this.touchEvts.pointerMoveHandler(d3.event))
          .on('wheel', () => this.touchEvts.mouseWheelHandler(d3.event));
      };

      rowLabel.setRectPointerEvents();

      rowLabel.text = rowLabel.g.append('text')
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'central')
        .style('fill', 'rgba(0,0,0,.8)')
        .style('font-weight', d.Died ? '900' : 'normal')
        .attr('x', sickRowLabelMarginLeft)
        .text(`
          ${d.Forenames} ${d.Name}
          ${(typeof d.AgeInYears !== 'undefined') ? ` (${d.AgeInYears}) ` : ''}
          — ${d['Disease.Classification.1']}
          ${(d['Disease.Classification.2'] !== '') ? ` (${d['Disease.Classification.2']})` : ''}`);

      rowLabel.g.transition()
        .duration(defaultTransitionDuration)
        .attr('opacity', 1);

      rowLabel.setPosition = (xStart, xEnd, yPos) => {
        const xStartMin = Math.max(xStart, yAxisLabelGroupXPadding + sickRowLabelMarginLeft);

        const labelHeight = defaultSickRowHeight * currentZoomTransform.ky;

        const clipPathWidth =
          (Math.max(
            (xEnd - xStartMin),
            labelHeight * defaultSickRowInversePaddingRatio
          )
          - sickRowLabelMarginLeft) / pixelRatio;

        rowLabel.g
          .attr('transform', `translate(${Math.max(xStartMin, yAxisLabelGroupXPadding + sickRowLabelMarginLeft)}, ${yPos})`)
          .style(
            'clip-path',
            `polygon(
              0 0, 
              ${clipPathWidth}px 0, 
              ${clipPathWidth}px ${labelHeight}px, 
              0% ${labelHeight}px)`
          );

        rowLabel.rect
          .attr('width', Math.max(xEnd - Math.max(xStart, yAxisLabelGroupXPadding + sickRowLabelMarginLeft), labelHeight * defaultSickRowInversePaddingRatio))
          .attr('x', '0')
          .attr('height', `${labelHeight * defaultSickRowInversePaddingRatio}px`)
          .attr('y', '0');

        rowLabel.text
          .style('opacity', d.opacity)
          .style('fill', canTextBeDarkForBg(d.colour) ? '#000' : '#fff')
          .attr('y', labelHeight * defaultSickRowInversePaddingRatio / 2)
          .attr('font-size', `${4 * currentZoomTransform.ky}px`);
      };

      rowLabel.remove = () => {
        rowLabel.g
          // .attr('opacity', 1)
          // .transition()
          // .duration(defaultSickRowYtransitionDuration)
          .attr('opacity', 0)
          .remove();

        delete d.label.remove;
      };

      d.visible = true;
      d.label = rowLabel;

      rowLabel.setPosition(x1, x2, y);
    }
  }

  hideAllRectLabels() {
    this.allData.forEach((d) => {
      if (d.visible && 'label' in d) {
        d.visible = false;
        d.label.remove();
      }
    });
  }

  setRectLabel(xStartKey, xEndKey, currentZoomTransform, xAxisScaleT) {
    // If zoomed in far enough => show rect labels
    if (currentZoomTransform.ky * defaultSickRowHeight > minRectangleLabelHeight) {
      this.visibleData.forEach((d) => {
        const startY = ((d.index) * defaultSickRowHeight * currentZoomTransform.ky) + currentZoomTransform.y;

        if (startY > 0 && startY < height) {
          const startX = xAxisScaleT(d[xStartKey]);
          const endX = xAxisScaleT(d[xEndKey]);

          // If visible
          if ((startX < 0 && endX > 0) ||
            (startX < width && endX > width) ||
            (startX > 0 && endX < width)) {
            // If was previously visible -> update position
            if (d.visible && 'label' in d) {
              d.label.setPosition(startX, endX, startY);

              // If was previously INvisible -> create label
            } else {
              this.createRectLabel(d, startX, endX, startY, currentZoomTransform);
            }

            // If was previously visible -> remove label
          } else if (d.visible && 'label' in d) {
            d.visible = false;
            d.label.remove();
          }

          // If was previously visible -> remove label
        } else if (d.visible && 'label' in d) {
          d.visible = false;
          d.label.remove();
        }
      });
    } else {
      this.hideAllRectLabels();
    }
  }

  onMouseOver(rowLabel) {
    return () => {
      rowLabel.oldClipPath = rowLabel.g.style('clip-path');
      rowLabel.oldRectWidth = rowLabel.rect.attr('width');

      rowLabel.rect
        .style('opacity', 0.5)
        .attr('width', Math.max(rowLabel.text.node().getBBox().width + (2 * sickRowLabelMarginLeft), rowLabel.oldRectWidth));

      rowLabel.g
        .style('clip-path', '');

      this.touchEvts.pointerMoveHandler(d3.event);
    };
  }

  onMouseOut(rowLabel) {
    return () => {
      rowLabel.g
        .style('clip-path', rowLabel.oldClipPath);

      rowLabel.rect
        .attr('width', rowLabel.oldRectWidth)
        .style('opacity', 0);

      // this.touchEvts.pointerMoveHandler(d3.event);
    };
  }

  onClick(rowLabel, d) {
    return () => {
      rowLabel.rect
        .on('pointerover', null)
        .on('pointerout', null)
        .on('click', null)
        .on('pointerdown', null)
        .on('pointermove', null)
        .on('pointerup', null)
        .on('pointercancel', null)
        .on('pointerleave', null)
        .on('wheel', null);

      this.showPopup(rowLabel, d);

      this.onMouseOut(rowLabel)();
    };
  }

  showPopup(rowLabel, d) {
    const popup = {};
    popup.bg = overlaySvg.append('rect')
      .attr('class', 'row-popup-bg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('fill', '#000')
      .style('opacity', 0);

    popup.g = overlaySvg.append('g')
      .attr('class', 'row-popup')
      .attr('transform', rowLabel.g.attr('transform'));

    popup.rect = popup.g.append('rect')
      .style('fill', d.colour)
      .style('stroke-width', '0px')
      .style('opacity', 0.5)
      .attr('width', rowLabel.rect.attr('width'))
      .attr('height', rowLabel.rect.attr('height'));

    popup.div = overlay
      .append('div')
      .classed('row-popup-div', true)
      .style('opacity', 0);


    popup.bg
      // Close popup on background click
      .on('click', () => {
        rowLabel.setRectPointerEvents();

        popup.div
          .transition()
          .duration(defaultTextTransitionDuration / 2)
          .style('opacity', 0)
          .on('end', () => {
            popup.bg
              .transition()
              .duration(defaultTransitionDuration / 2)
              .style('opacity', 0)
              .remove();

            popup.g
              .transition()
              .duration(defaultTransitionDuration)
              .attr('transform', rowLabel.g.attr('transform'))
              .transition()
              .duration(defaultTransitionDuration / 4)
              .style('opacity', 0)
              .remove();

            popup.rect
              .transition()
              .duration(defaultTransitionDuration)
              .style('fill', d.colour)
              .style('opacity', 0.5)
              .attr('width', rowLabel.rect.attr('width'))
              .attr('height', rowLabel.rect.attr('height'));

            popup.div.remove();
          });
      })
      .transition()
      .duration(defaultTransitionDuration)
      .style('opacity', 0.6);

    const generatePopupText = () => {
      const popupContent = {
        Age: row => `${(row.AgeInYears !== '') ? `${row.AgeInYears}` : 'unknown'}${(row['Year.of.Birth'] !== '') ? ` (Born in ${row['Year.of.Birth']})` : ''}`,
        Died: row => paste([row.DeathDateDay, row.DeathDateMonth, row.DeathDateYear], ' '),
        Height: row => `${(row.HeightFeet !== '') ? `${row.HeightFeet}′` : ''}${(row.HeightInches !== '') ? ` ${row.HeightInches}″` : ''}`,
        'Disease Class': row => paste([row['Disease.Classification.1'], row['Disease.Classification.2']], ', '),
        Disease: row => row['Disease.or.Wound'],
        Type: row => row.Quality,
        Occupation: row => row.Occupation,
        'Ship and Year': row => row.ShipWithYear,
        From: row => paste([row.NP_Town, row.NP_CountyState, row.NP_Country], ', '),
        'Trial at': row => paste([row.Trial_PlaceCourt, row.Trial_PlaceLocation, row.Trial_PlaceCountry], ', '),
        Sentence: row => row.Crime_Sentence,
        'Prior Convictions': row => `${(row.PriorConvictionCount) ? `${row.PriorConvictionCount}` : '0'}`

      };

      popup.div.append('span')
        .classed('row-popup-title', true)
        .text(`${d.Forenames} ${d.Name}`);

      popup.div
        .append('span')
        .classed('row-popup-value', true)
        .text(((d.Gender === 1) ? 'Male' : 'Female') + ((d.Died) ? ' (Died)' : ''));

      Object.keys(popupContent).forEach((key) => {
        const value = popupContent[key](d);
        if (value !== '') {
          popup.div
            .append('span')
            .classed('row-popup-key', true)
            .text(key);

          popup.div
            .append('span')
            .classed('row-popup-value', true)
            .text(value);
        }
      });

      popup.div
        .append('span')
        .classed('row-popup-id', true)
        .text(d.id + ((d.Convict) ? ` (${d.ConvictId})` : ''));

      popup.div
        .transition()
        .duration(defaultTextTransitionDuration / 2)
        .style('opacity', 1);
    };

    popup.g
      .transition()
      .duration(defaultTransitionDuration)
      .attr('transform', `translate(${(width - popupWidth) / 2}, ${(height - popupHeight) / 2})`)
      .on('end', generatePopupText);

    popup.rect
      .transition()
      .duration(defaultTransitionDuration)
      .style('fill', '#fff')
      .attr('width', popupWidth)
      .attr('height', popupHeight)
      .style('opacity', 0.9);
  }
}
