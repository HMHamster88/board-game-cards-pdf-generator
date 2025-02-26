function formatNumber(number) {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
        number,
    )
}

function G0(gCodes, x, y) {
    gCodes.push(`G0 X${formatNumber(x)} Y${formatNumber(y)}`);
}

function G1(gCodes, x, y, f) {
    gCodes.push(`G1 X${formatNumber(x)} Y${formatNumber(y)}` + (f ? `F${formatNumber(f)}` : ''));
}

function G3(gCodes, x, y, i, j) {
    gCodes.push(`G3 X${formatNumber(x)} Y${formatNumber(y)} I${formatNumber(i)} J${formatNumber(j)}`);
}

function addRectGCode(rectX, rectY, rectWidth, rectHeight, rectRoundingRadius, dragKnifeOffset, feedRate, contourStartCode, contourEndCode, passCount, gCodes) {
    G0(gCodes, rectX + rectWidth / 2 - dragKnifeOffset * 2, rectY);
    gCodes.push(contourStartCode);
    for (var pass = 0; pass < passCount; pass++) {
        G1(gCodes, rectX + rectWidth - rectRoundingRadius + dragKnifeOffset, rectY, feedRate);
        G3(gCodes, rectX + rectWidth, rectY + rectRoundingRadius + dragKnifeOffset, -dragKnifeOffset, rectRoundingRadius);
        G1(gCodes, rectX + rectWidth, rectY + rectHeight - rectRoundingRadius + dragKnifeOffset);
        G3(gCodes, rectX + rectWidth - rectRoundingRadius - dragKnifeOffset, rectY + rectHeight, -rectRoundingRadius, -dragKnifeOffset);
        G1(gCodes, rectX + rectRoundingRadius - dragKnifeOffset, rectY + rectHeight);
        G3(gCodes, rectX, rectY + rectHeight - rectRoundingRadius - dragKnifeOffset, dragKnifeOffset, -rectRoundingRadius);
        G1(gCodes, rectX, rectY + rectRoundingRadius - dragKnifeOffset);
        G3(gCodes, rectX + rectRoundingRadius + dragKnifeOffset, rectY, rectRoundingRadius, dragKnifeOffset);
        G1(gCodes, rectX + rectWidth / 2, rectY);
    }
    gCodes.push(contourEndCode);
}