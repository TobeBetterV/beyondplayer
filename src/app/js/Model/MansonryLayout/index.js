import EventEmitter from 'events';

export default class MansonryLayout extends EventEmitter {
    options;
    container;

    columnCount;
    columnHeights = void 0;

    persist = void 0; // packing new elements, or all elements?

    nodes = void 0;
    nodesWidths = void 0;
    nodesHeights = void 0;

    packed;

    constructor(options) {
        super();
        this.options = options;
        this.container = this.options.container.nodeType ? this.options.container : document.querySelector(this.options.container);
        this.packed = this.options.packed.indexOf('data-') === 0 ? this.options.packed : 'data-' + this.options.packed;
        this.size = this.options.size;
        this.position = this.options.position !== false;
    }

    selectors = {
        all: () => {
            return this.toArray(this.container.children);
        },
        new: () => {
            return this.toArray(this.container.children).filter(node => {
                return !node.hasAttribute('' + this.packed);
            });
        }
    };

    runSeries = functions => {
        functions.forEach(function(func) {
            return func();
        });
    };

    toArray = input => {
        return Array.prototype.slice.call(input);
    };

    fillArray = length => {
        return Array.apply(null, Array(length)).map(function() {
            return 0;
        });
    };

    setupColumns = () => {
        this.columnCount = Math.floor(this.container.clientWidth / (this.size.columnWidth + this.size.gap));
        this.columnHeights = this.fillArray(this.columnCount);

        this.margin = (this.container.clientWidth - this.columnCount * this.size.columnWidth - (this.columnCount - 1) * this.size.gap) / 2.0;
    };

    setupNodes = () => {
        this.nodes = this.selectors[this.persist ? 'new' : 'all']();
    };

    setupNodesDimensions = () => {
        if (this.nodes.length === 0) return;

        this.nodesWidths = this.nodes.map(function(element) {
            return element.clientWidth;
        });
        this.nodesHeights = this.nodes.map(function(element) {
            return element.clientHeight;
        });
    };

    setupNodesStyles = () => {
        this.nodes.forEach((element, index) => {
            //alert(Math.min.apply(Math, this.columnHeights));
            //const columnIndex = this.columnHeights.indexOf(Math.min.apply(Math, this.columnHeights));
            const columnIndex = index % this.columnHeights.length;

            element.style.position = 'absolute';

            const nodeTop = this.columnHeights[columnIndex] + 'px';

            //alert(columnIndex)
            const nodeLeft = this.margin + columnIndex * this.size.columnWidth + columnIndex * this.size.gap + 'px';

            //alert(nodeLeft);

            element.style.top = nodeTop;
            element.style.left = nodeLeft;
            element.setAttribute(this.packed, '');

            // ignore nodes with no width and/or height
            const nodeWidth = this.nodesWidths[index];
            const nodeHeight = this.nodesHeights[index];

            if (nodeWidth && nodeHeight) {
                this.columnHeights[columnIndex] += nodeHeight + this.size.vgap;
            }
        });
    };

    // API
    pack = () => {
        this.persist = false;
        this.runSeries(this.setup.concat(this.run));
        return this.emit('pack');
    };

    update = () => {
        this.persist = true;
        this.runSeries(this.run);
        return this.emit('update');
    };

    setup = [this.setupColumns];
    run = [this.setupNodes, this.setupNodesDimensions, this.setupNodesStyles];
}
