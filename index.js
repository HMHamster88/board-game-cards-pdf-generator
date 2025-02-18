const jsPDF = window.jspdf.jsPDF;
const dbVersion = 1;
const projectsStorageName = 'projects';
const defaultProjectId = 'default';

const a4PageSize = {
    width: 210,
    height: 297
};

class ImageSource {
    constructor(src) {
        this.id = "id" + Math.random().toString(16).slice(2)
        this.src = src;
        this.repeatCount = 1;
        this.width = 64;
        this.height = 64;
    }
}

/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

function localize(language) {
    if (['ru-RU'].includes(language)) {
        let lang = ':lang(' + language + ')';
        let hide = '[lang]:not(' + lang + ')';
        document.querySelectorAll(hide).forEach(function (node) {
            node.style.display = 'none';
        });
        let show = '[lang]' + lang;
        document.querySelectorAll(show).forEach(function (node) {
            node.style.display = 'unset';
        });
    }
}

function getBase64(file, onload) {
    var reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
        onload(reader.result);
    };
    reader.onerror = function (error) {
        console.log('Error: ', error);
    };
}

function download(data, filename, type) {
    var file = new Blob([data], { type: type });
    if (window.navigator.msSaveOrOpenBlob) // IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    else { // Others
        var a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function () {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

const defaultProject = {
    id: defaultProjectId,
    autoGeneration: false,
    images: [
    ],
    page: {
        margins: {
            top: 3,
            bottom: 3,
            right: 3,
            left: 3,
            draw: false,
        }
    },
    card: {
        slice: {
            horizontalCount: 5,
            verticalCount: 2,
            rotateAngle: 0
        },
        size: {
            width: 88.9,
            height: 57.15
        },
        gap: {
            vertical: 0,
            horizontal: 0
        },
        rounding: 3,
        stroke: {
            color: '#dddddd',
            width: 0.2
        },
        corner: {
            length: 2,
            stroke: {
                color: '#000000',
                width: 0.2
            },
            margins: {
                top: 0,
                bottom: 0,
                right: 0,
                left: 0
            }
        }
    },
    repeatAll: 1,
    gcode: {
        startCode: 'G0 X0 Y0',
        endCode: '',
        cardsCount: 0,
        dragKnifeOffset: 0.25,
        feedRate: 2000,
        contourStartCode: "G1 F1000\r\n M3 S1000\r\nG4 P0.25",
        contourEndCode: "M3 S0\r\nG4 P0.25",
        passCount: 1,
        xOffset: 0,
        yOffset: 0,
        xScale: 1,
        yScale: 1
    }
};

var app = new Vue({
    el: '#app',
    data: {
        db: null,
        project: mergeDeep({}, defaultProject)
    },
    mounted() {
        this.$nextTick(function () {
            this.openDb();
            console.log(this.project);
        })
    },
    methods: {
        openDb() {
            let openRequest = indexedDB.open("store", dbVersion);

            openRequest.onupgradeneeded = event => {
                let db = openRequest.result;
                switch (event.oldVersion) {
                    case 0:
                        this.initDb(db);
                }
            };

            openRequest.onerror = () => {
                console.error("Error", openRequest.error);
            };

            openRequest.onsuccess = () => {
                this.db = openRequest.result;
                this.loadProject();
            };
        },
        initDb(db) {
            db.createObjectStore(projectsStorageName, { keyPath: 'id' });
        },
        onLoadImage: function (event) {
            event.target.files.forEach(file => getBase64(file, data => this.project.images.push(new ImageSource(data))));
        },
        async addAndSliceImage() {
            const pickerOpts = {
                types: [
                    {
                        description: 'İmage Files',
                        accept: {
                            'image/*': ['.png', '.gif', '.jpeg', '.jpg'],
                        },
                    },
                ],
                excludeAcceptAllOption: true,
                multiple: true,
            };

            const fileHandles = await window.showOpenFilePicker(pickerOpts);

            for (var fileHandle of fileHandles) {
                const fileData = await fileHandle.getFile();
                var reader = new FileReader();
                reader.readAsDataURL(fileData);
                reader.onload = (event) => {
                    var slice = this.project.card.slice;
                    this.sliceImage(event.target.result, slice.horizontalCount, slice.verticalCount, slice.rotateAngle, images => {
                        images.forEach(image => {
                            this.project.images.push(new ImageSource(image));
                        })
                    })
                };
                reader.onerror = error => {
                    console.log('Error: ', error);
                };
            }
        },
        sliceImage(imageDataUrl, horizontalCount, verticalCount, rotateAngle, resultCallback) {
            var image = new Image();
            angleInRadians = rotateAngle * Math.PI / 180;
            changeDimensions = rotateAngle == '90' || rotateAngle == '270';
            image.onload = () => {
                var imagePieces = [];
                widthOfOnePiece = image.width / horizontalCount;
                heightOfOnePiece = image.height / verticalCount;
                for(var y = 0; y < verticalCount; ++y) {
                    for(var x = 0; x < horizontalCount; ++x) {
                        var canvas = document.createElement('canvas');
                        
                        canvas.width = changeDimensions ? heightOfOnePiece :  widthOfOnePiece;
                        canvas.height = changeDimensions ? widthOfOnePiece : heightOfOnePiece;
                        var context = canvas.getContext('2d');

                        canvasCenterX = canvas.width / 2;
                        canvasCenterY = canvas.height / 2;
                        context.translate(canvasCenterX, canvasCenterY);
                        context.rotate(angleInRadians);

                        context.drawImage(image, x * widthOfOnePiece, y * heightOfOnePiece, widthOfOnePiece, heightOfOnePiece, 
                            -widthOfOnePiece / 2, -heightOfOnePiece / 2, widthOfOnePiece, heightOfOnePiece);
                        
                        context.rotate(-angleInRadians);
                        context.translate(-canvasCenterX, -canvasCenterY);

                        imagePieces.push(canvas.toDataURL());
                    }
                }
                resultCallback(imagePieces);
            };
            image.src = imageDataUrl;
        },
        onLoadProject(event) {
            var file = event.target.files[0];
            var reader = new FileReader();
            reader.readAsText(file);
            reader.onload = () => {
                var openedProject = JSON.parse(reader.result);
                mergeDeep(this.project, openedProject)
            };
            reader.onerror = error => {
                console.log('Error: ', error);
            };
        },
        removeAllImages() {
            this.project.images = [];
        },
        getPageCount() {
            var cardsCount = this.getTableCardsCount();
            var perpPageCardsCount = cardsCount.horizontal * cardsCount.vertical;
            var totalCardsCount = this.project.images.map(image => image.repeatCount).reduce((partialSum, a) => partialSum + a, 0);
            return Math.ceil(totalCardsCount / perpPageCardsCount);
        },
        addImageFromUrl() {
            this.project.images.push(new ImageSource(this.addImageUrl))
        },
        removeImageSource(image) {
            this.project.images = this.project.images.filter(item => item !== image);
        },
        newProject() {
            this.project = mergeDeep({}, defaultProject);
        },
        saveProject: function () {
            if (this.project) {
                let transaction = this.db.transaction(projectsStorageName, "readwrite");
                let projects = transaction.objectStore(projectsStorageName);
                let request = projects.put(this.project);
                request.onsuccess = () => {
                    console.log("Project saved", request.result);
                };
                request.onerror = () => {
                    console.log("Project save error", request.error);
                };
            }
        },
        async saveProjectToFile() {
            const opts = {
                types: [
                    {
                        description: "JSON",
                        accept: { "application/json": [".json"] },
                    },
                ],
            };
            var fileHandle = await window.showSaveFilePicker(opts);
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(this.project));
            await writable.close();
        },
        async loadProjectFromFile() {
            const pickerOpts = {
                types: [
                    {
                        description: "JSON",
                        accept: { "application/json": [".json"] },
                    },
                ],
                excludeAcceptAllOption: true,
                multiple: false,
            };

            const [fileHandle] = await window.showOpenFilePicker(pickerOpts);
            const fileData = await fileHandle.getFile();
            var reader = new FileReader();
            reader.readAsText(fileData);
            reader.onload = () => {
                var openedProject = JSON.parse(reader.result);
                mergeDeep(this.project, openedProject);
            };
            reader.onerror = error => {
                console.log('Error: ', error);
            };
        },
        loadProject: function () {
            let transaction = this.db.transaction(projectsStorageName, "readwrite");
            let projects = transaction.objectStore(projectsStorageName);
            let request = projects.get(defaultProjectId);
            request.onsuccess = () => {
                let savedProject = request.result;
                if (savedProject) {
                    mergeDeep(this.project, savedProject);
                }
            }
            request.onerror = () => {
                console.log("Project load error", request.error);
            };
        },
        imageLoaded(event, image) {
            image.width = event.target.naturalWidth;
            image.height = event.target.naturalHeight;
        },
        getEfectiveSize() {
            var margins = this.project.page.margins;
            return {
                width: a4PageSize.width - margins.left - margins.right,
                height: a4PageSize.height - margins.top - margins.bottom
            }
        },
        getTableCardsCount() {
            var effectiveSize = this.getEfectiveSize();
            var cardGap = this.project.card.gap;
            var cardSize = this.project.card.size;
            return {
                horizontal: Math.floor(effectiveSize.width / (cardSize.width + cardGap.horizontal)),
                vertical: Math.floor(effectiveSize.height / (cardSize.height + cardGap.vertical))
            }
        },
        async generateGCode() {
            var gcodes = [];

            const opts = {
                suggestedName: "cards.nc",
                types: [
                    {
                        description: "NC",
                        accept: { "text/plain": [".nc"] }
                    },
                ],
            };
            var fileHandle = await window.showSaveFilePicker(opts);
            const writable = await fileHandle.createWritable();

            var margins = this.project.page.margins;
            var effectiveSize = this.getEfectiveSize();
            var cardGap = this.project.card.gap;
            var cardSize = this.project.card.size;

            var cardsCount = this.getTableCardsCount();

            var tableWidth = cardsCount.horizontal * cardSize.width + (cardsCount.horizontal - 1) * cardGap.horizontal;
            var tableHeight = cardsCount.vertical * cardSize.height + (cardsCount.vertical - 1) * cardGap.vertical;

            var tableX = margins.left + (effectiveSize.width - tableWidth) / 2;
            var tableY = margins.top + (effectiveSize.height - tableHeight) / 2;

            var gcodeSettings = this.project.gcode;
            var cardIndex = 0;

            var cornerMargins = this.project.card.corner.margins;

            gcodes.push(gcodeSettings.startCode);
            (() => {
                for (var cardRow = 0; cardRow < cardsCount.vertical; cardRow++) {
                    for (var cardColumn = 0; cardColumn < cardsCount.horizontal; cardColumn++) {
                        var cutCardColumn = (cardsCount.horizontal - cardColumn - 1);//cardRow % 2 == 1 ? cardColumn : (cardsCount.horizontal - cardColumn - 1);
                        var cardX = a4PageSize.width - (tableX + cutCardColumn * (cardSize.width + cardGap.horizontal) - cornerMargins.right) - cardSize.width;
                        var cardY = tableY + cardRow * (cardSize.height + cardGap.vertical) + cornerMargins.top;
                        addRectGCode(
                            cardX * gcodeSettings.xScale + gcodeSettings.xOffset,
                            cardY * gcodeSettings.yScale + gcodeSettings.yOffset,
                            (cardSize.width - (cornerMargins.left + cornerMargins.right)) * gcodeSettings.xScale,
                            (cardSize.height - (cornerMargins.top + cornerMargins.bottom)) * gcodeSettings.yScale,
                            this.project.card.rounding, gcodeSettings.dragKnifeOffset,
                            gcodeSettings.feedRate, gcodeSettings.contourStartCode,
                            gcodeSettings.contourEndCode,
                            gcodeSettings.passCount,
                            gcodes);
                        cardIndex++;
                        if (gcodeSettings.cardsCount != 0 && cardIndex >= gcodeSettings.cardsCount) {
                            return;
                        }
                    }
                }
            })();
            gcodes.push(gcodeSettings.endCode);
            await writable.write(gcodes.join("\r\n"));
            await writable.close();
        },
        generatePdf() {
            console.log('start generation');
            const doc = new jsPDF();

            var margins = this.project.page.margins;
            var effectiveSize = this.getEfectiveSize();
            var cardGap = this.project.card.gap;
            var cardSize = this.project.card.size;

            var cardsCount = this.getTableCardsCount();

            var tableWidth = cardsCount.horizontal * cardSize.width + (cardsCount.horizontal - 1) * cardGap.horizontal;
            var tableHeight = cardsCount.vertical * cardSize.height + (cardsCount.vertical - 1) * cardGap.vertical;

            var tableX = margins.left + (effectiveSize.width - tableWidth) / 2;
            var tableY = margins.top + (effectiveSize.height - tableHeight) / 2;

            var tableImages = [];

            for (var i = 0; i < this.project.repeatAll; i++) {
                this.project.images.forEach(image => {
                    for (var i = 0; i < image.repeatCount; i++) {
                        tableImages.push(image);
                    }
                });
            }


            if (margins.draw) {
                doc.setDrawColor('#d1d1d1');
                doc.setLineWidth(this.project.card.stroke.width);
                doc.setLineDashPattern([5, 1]);
                doc.rect(margins.left, margins.top, effectiveSize.width, effectiveSize.height);
                doc.setLineDashPattern();
            }

            var cornerLength = this.project.card.corner.length;
            var imageIndex = 0;

            var pageCount = this.getPageCount();
            for (var pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                if (pageIndex != 0) {
                    doc.addPage();
                }
                for (var cardRow = 0; cardRow < cardsCount.vertical; cardRow++) {
                    for (var cardColumn = 0; cardColumn < cardsCount.horizontal; cardColumn++) {
                        var tableImage = tableImages[imageIndex];
                        if (!tableImage) {
                            break;
                        }
                        imageIndex++;

                        var cardX = tableX + cardColumn * (cardSize.width + cardGap.horizontal);
                        var cardY = tableY + cardRow * (cardSize.height + cardGap.vertical);
                        doc.addImage(tableImage.src, null, cardX, cardY, cardSize.width, cardSize.height, null, null, null);
                        doc.setDrawColor(this.project.card.stroke.color);
                        doc.setLineWidth(this.project.card.stroke.width);
                        var cornerMargins = this.project.card.corner.margins;

                        if (this.project.card.stroke.width != 0) {
                            doc.roundedRect(cardX + cornerMargins.left, 
                                cardY + cornerMargins.top, 
                                cardSize.width - (cornerMargins.left + cornerMargins.right), 
                                cardSize.height - (cornerMargins.top + cornerMargins.bottom), 
                                this.project.card.rounding, 
                                this.project.card.rounding
                            );
                        }


                        var cardRight = cardX + cardSize.width;
                        var cardBottom = cardY + cardSize.height;
                        doc.setDrawColor(this.project.card.corner.stroke.color);
                        doc.setLineWidth(this.project.card.corner.stroke.width);
                        if (this.project.card.corner.stroke.width != 0) {
                            doc.lines([
                                [-cornerLength, 0],
                                [0, cornerLength],
                            ], cardX + cornerLength + cornerMargins.left, cardY + cornerMargins.top);
                            doc.lines([
                                [cornerLength, 0],
                                [0, cornerLength],
                            ], cardRight - cornerLength - cornerMargins.right, cardY + cornerMargins.top);
                            doc.lines([
                                [cornerLength, 0],
                                [0, -cornerLength],
                            ], cardRight - cornerLength - cornerMargins.right, cardBottom - cornerMargins.bottom);

                            doc.lines([
                                [-cornerLength, 0],
                                [0, -cornerLength],
                            ], cardX + cornerLength + cornerMargins.left, cardBottom - cornerMargins.bottom);
                        }
                    }
                }
            }
            document.querySelector("iframe").src = window.URL.createObjectURL(doc.output('blob'));
            //download(doc.output('blob'), 'cards.pdf', 'application/pdf');
            console.log('generation finished');
        }
    },
    watch: {
        project: {
            deep: true,
            handler: function (val, oldVal) {
                this.saveProject();
                if (this.project.autoGeneration) {
                    this.generatePdf();
                }
            }
        }
    }
});

localize(window.navigator.language);