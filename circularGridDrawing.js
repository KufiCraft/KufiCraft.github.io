// Expose functions to global scope
window.getCircularCoor = getCircularCoor;
window.drawCircularRect = drawCircularRect;
window.drawCircularLine = drawCircularLine;
window.drawCircularArch = drawCircularArch;

/**
 * Calculates the snapped polar coordinates and dimensions for drawing a circular segment.
 * @param {object} board - The Kufi instance.
 * @param {number} _x - The raw X coordinate.
 * @param {number} _y - The raw Y coordinate.
 * @returns {{innerRadius: number, outerRadius: number, startAngle: number, endAngle: number}} - The snapped polar coordinates and dimensions.
 */
function getCircularCoor(board, _x, _y) {
    const centerX = 500; // Fixed to SVG viewBox center
    const centerY = 500; // Fixed to SVG viewBox center
    const dx = _x - centerX;
    const dy = _y - centerY;

    const angle = Math.atan2(dy, dx);
    let radius = Math.sqrt(dx * dx + dy * dy);

    const normalizedAngle = angle < 0 ? angle + 2 * Math.PI : angle;

    let radialStep, angularStep;
    let innerRadius, outerRadius, startAngle, endAngle;

    // Calculate the scaling factor from board.size to SVG viewBox (1000)
    const scaleFactor = 1;

    if (board.mono) {
        radialStep = board.rect * scaleFactor;
        angularStep = Math.PI / 18; // 36 divisions

        const radialIndex = Math.floor(radius / radialStep);
        innerRadius = radialIndex * radialStep;
        outerRadius = innerRadius + radialStep;

        const angularIndex = Math.floor(normalizedAngle / angularStep);
        startAngle = angularIndex * angularStep;
        endAngle = startAngle + angularStep;

    } else {
        const one = (board.rect / 4) * scaleFactor;
        const three = (board.rect - (board.rect / 4)) * scaleFactor;

        const radialSegment = radius % (board.rect * scaleFactor);
        if (radialSegment < three) {
            innerRadius = radius - radialSegment;
            outerRadius = innerRadius + three;
        } else {
            innerRadius = radius - radialSegment + three;
            outerRadius = innerRadius + one;
        }

        const angularUnit = Math.PI / 72; // Smaller angular unit for non-mono (1/4 of 10 degrees)
        const angularSegment = normalizedAngle % (Math.PI / 18);
        if (angularSegment < (Math.PI / 18) * (3/4)) {
            startAngle = normalizedAngle - angularSegment;
            endAngle = startAngle + (Math.PI / 18) * (3/4);
        } else {
            startAngle = normalizedAngle - angularSegment + (Math.PI / 18) * (3/4);
            endAngle = startAngle + (Math.PI / 18) * (1/4);
        }
    }

    return { innerRadius, outerRadius, startAngle, endAngle };
}

/**
 * Draws a circular segment on the SVG canvas.
 * @param {object} board - The Kufi instance.
 * @param {number} _x - The raw X coordinate.
 * @param {number} _y - The raw Y coordinate.
 * @returns {HTMLElement} - The created SVG path element.
 */
function drawCircularRect(board, _x, _y) {
    let el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    let { innerRadius, outerRadius, startAngle, endAngle } = getCircularCoor(board, _x, _y);

    el.dataset.innerRadius = innerRadius;
    el.dataset.outerRadius = outerRadius;
    el.dataset.startAngle = startAngle;
    el.dataset.endAngle = endAngle;

    const centerX = 500; // Fixed to SVG viewBox center
    const centerY = 500; // Fixed to SVG viewBox center

    const outerX1 = centerX + outerRadius * Math.cos(startAngle);
    const outerY1 = centerY + outerRadius * Math.sin(startAngle);
    const outerX2 = centerX + outerRadius * Math.cos(endAngle);
    const outerY2 = centerY + outerRadius * Math.sin(endAngle);

    const innerX1 = centerX + innerRadius * Math.cos(startAngle);
    const innerY1 = centerY + innerRadius * Math.sin(startAngle);
    const innerX2 = centerX + innerRadius * Math.cos(endAngle);
    const innerY2 = centerY + innerRadius * Math.sin(endAngle);

    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;

    const d = `M ${outerX1},${outerY1}
               A ${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${outerX2},${outerY2}
               L ${innerX2},${innerY2}
               A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${innerX1},${innerY1}
               Z`;

    el.setAttribute('d', d);
    el.setAttribute('fill', board.color);
    board.svg.appendChild(el);
    return el;
}

/**
 * Draws a straight line between two selected circular segments.
 * @param {object} board - The Kufi instance.
 * @returns {boolean} - True if the line is drawn, false otherwise.
 */
function drawCircularLine(board) {
    if (board.lines.length < 2) {
        board.info('الرجاء تحديد قطعتين دائريتين لإنشاء خط');
        return false;
    }

    const centerX = 500; // Fixed to SVG viewBox center
    const centerY = 500; // Fixed to SVG viewBox center

    const segment1 = board.lines[0];
    const segment2 = board.lines[1];

    const midAngle1 = (segment1.startAngle + segment1.endAngle) / 2;
    const midRadius1 = (segment1.innerRadius + segment1.outerRadius) / 2;
    const x1 = centerX + midRadius1 * Math.cos(midAngle1);
    const y1 = centerY + midRadius1 * Math.sin(midAngle1);

    const midAngle2 = (segment2.startAngle + segment2.endAngle) / 2;
    const midRadius2 = (segment2.innerRadius + segment2.outerRadius) / 2;
    const x2 = centerX + midRadius2 * Math.cos(midAngle2);
    const y2 = centerY + midRadius2 * Math.sin(midAngle2);

    let el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    el.setAttribute('x1', x1);
    el.setAttribute('y1', y1);
    el.setAttribute('x2', x2);
    el.setAttribute('y2', y2);
    el.setAttribute('stroke', board.color);
    el.setAttribute('stroke-width', (board.rect / 2) * scaleFactor);

    board.svg.insertBefore(el, board.svg.firstChild);
    board.resets();
    board.info(-1);
    return true;
}

/**
 * Draws an arc between two selected circular segments.
 * @param {object} board - The Kufi instance.
 * @param {HTMLElement} el1 - The first circular segment element.
 * @param {HTMLElement} el2 - The second circular segment element.
 * @param {boolean} [bool=false] - Determines the direction/orientation of the arc.
 * @returns {boolean} - Always returns true.
 */
function drawCircularArch(board, el1, el2, bool = false) {
    const centerX = 500; // Fixed to SVG viewBox center
    const centerY = 500; // Fixed to SVG viewBox center

    const seg1 = el1.dataset;
    const seg2 = el2.dataset;

    const innerRadius = Math.min(seg1.innerRadius, seg2.innerRadius);
    const outerRadius = Math.max(seg1.outerRadius, seg2.outerRadius);
    const startAngle = Math.min(seg1.startAngle, seg2.startAngle);
    const endAngle = Math.max(seg1.endAngle, seg2.endAngle);

    const largeArcFlag = (endAngle - startAngle) > Math.PI ? 1 : 0;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const outerX1 = centerX + outerRadius * Math.cos(startAngle);
    const outerY1 = centerY + outerRadius * Math.sin(startAngle);
    const outerX2 = centerX + outerRadius * Math.cos(endAngle);
    const outerY2 = centerY + outerRadius * Math.sin(endAngle);

    const innerX1 = centerX + innerRadius * Math.cos(startAngle);
    const innerY1 = centerY + innerRadius * Math.sin(startAngle);
    const innerX2 = centerX + innerRadius * Math.cos(endAngle);
    const innerY2 = centerY + innerRadius * Math.sin(endAngle);

    const d = bool
      ? `M ${innerX1},${innerY1}
         A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 1 ${innerX2},${innerY2}
         L ${outerX2},${outerY2}
         A ${outerRadius},${outerRadius} 0 ${largeArcFlag} 0 ${outerX1},${outerY1}
         Z`
      : `M ${outerX1},${outerY1}
         A ${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${outerX2},${outerY2}
         L ${innerX2},${innerY2}
         A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${innerX1},${innerY1}
         Z`;

    path.setAttribute('d', d);
    path.setAttribute('fill', board.color);
    board.info(-1);
    let search = board.svg.querySelector(`[d='${path.getAttribute('d')}']`);
    if (search) {
      board.info('يوجد بالفعل قوس بين هذه النقاط');
      search.remove();
    }
    board.svg.appendChild(path);
    return true;
} 