function addRectGCode(rectX, rectY, rectWidth, rectHeight, rectRoundingRadius, dragKnifeOffset, feedRate, contourStartCode, contourEndCode, passCount, gCodes) {
    gCodes.push(`G0 X${rectX + rectWidth / 2 - dragKnifeOffset * 2} Y${rectY}`);
    gCodes.push(contourStartCode);
    for (var pass = 0; pass < passCount; pass++) {
        
        gCodes.push(`G1 X${rectX + rectWidth - rectRoundingRadius + dragKnifeOffset} Y${rectY} F${feedRate}`);
        gCodes.push(`G3 X${rectX + rectWidth} Y${rectY + rectRoundingRadius + dragKnifeOffset} I${-dragKnifeOffset} J${rectRoundingRadius}`);
        gCodes.push(`G1 X${rectX + rectWidth} Y${rectY + rectHeight - rectRoundingRadius + dragKnifeOffset}`);
        gCodes.push(`G3 X${rectX + rectWidth - rectRoundingRadius - dragKnifeOffset} Y${rectY + rectHeight} I${-rectRoundingRadius} J${-dragKnifeOffset}`);
        gCodes.push(`G1 X${rectX + rectRoundingRadius - dragKnifeOffset} Y${rectY + rectHeight}`);
        gCodes.push(`G3 X${rectX} Y${rectY + rectHeight  - rectRoundingRadius - dragKnifeOffset} I${dragKnifeOffset} J${-rectRoundingRadius}`);
        gCodes.push(`G1 X${rectX} Y${rectY + rectRoundingRadius - dragKnifeOffset}`);
        gCodes.push(`G3 X${rectX + rectRoundingRadius + dragKnifeOffset} Y${rectY} I${rectRoundingRadius} J${dragKnifeOffset}`);
        gCodes.push(`G1 X${rectX + rectWidth / 2} Y${rectY}`);
        
    }
    gCodes.push(contourEndCode);
}