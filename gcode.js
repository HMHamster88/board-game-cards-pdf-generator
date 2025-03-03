function formatNumber(number) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3, useGrouping: false }).format(
        number,
    )
}

function G0(gCodes, x, y) {
    gCodes.push(`G0 X${formatNumber(x)} Y${formatNumber(y)}`);
}

function G1(gCodes, x, y, f) {
    gCodes.push(`G1 X${formatNumber(x)} Y${formatNumber(y)}` + (f ? ` F${formatNumber(f)}` : ''));
}

function G3(gCodes, x, y, i, j) {
    gCodes.push(`G3 X${formatNumber(x)} Y${formatNumber(y)} I${formatNumber(i)} J${formatNumber(j)}`);
}

function arc(x, y, angle1, angle2, radius, lineCount) {
    var angleDelta = (angle2 - angle1) / lineCount;
    var result = [];
    for(var angle = angle1; angle <= angle2; angle += angleDelta) {
        var point = Vector2D.atAngle(angle, radius);
        point = point.inverted();
        point = point.add(new Vector2D(x, y));
        result.push(point);
    }
    return result;
}

function countourToGCodes(gCodes, contour, feedrate, dragKnifeOffset) {
    var lastPoint = null;
    for(var point of contour) {
        if (lastPoint == null) {
            G1(gCodes, point.x, point.y, feedrate);
        } else {
            var newPoint = point.sub(lastPoint).normalized().mul(dragKnifeOffset).add(point);
            G1(gCodes, newPoint.x, newPoint.y, feedrate);
        }

        lastPoint = point;
    }
}

function addRectGCode(rectX, rectY, rectWidth, rectHeight, rectRoundingRadius, dragKnifeOffset, feedRate, contourStartCode, contourEndCode, passCount, gCodes) {
    G0(gCodes, rectX + rectWidth / 2 - dragKnifeOffset * 2, rectY);
    var arcLineCount = 32;
    var contour = [];
    contour.push(...arc(rectX + rectWidth - rectRoundingRadius, rectY + rectRoundingRadius, Math.PI * 0.5, Math.PI, rectRoundingRadius, arcLineCount));
    contour.push(...arc(rectX + rectWidth - rectRoundingRadius, rectY + rectHeight - rectRoundingRadius, Math.PI, Math.PI * 1.5, rectRoundingRadius, arcLineCount));
    contour.push(...arc(rectX + rectRoundingRadius, rectY + rectHeight - rectRoundingRadius, Math.PI * 1.5, Math.PI * 2, rectRoundingRadius, arcLineCount));
    contour.push(...arc(rectX + rectRoundingRadius, rectY + rectRoundingRadius, 0 , Math.PI * 0.5, rectRoundingRadius, arcLineCount));
    contour.push(new Vector2D(rectX + rectWidth / 2 + dragKnifeOffset * 2, rectY));

    gCodes.push(contourStartCode);
    for (var pass = 0; pass < passCount; pass++) {
        countourToGCodes(gCodes, contour, feedRate, dragKnifeOffset);
    }
    gCodes.push(contourEndCode);
}