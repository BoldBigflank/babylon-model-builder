import { Sprite, Button, track, untrack, bindKeys, on, emit } from 'kontra'

const modes = {
    NONE: 'Edit', ADD: 'Add', NEW: 'New', DELETE: 'Del'
}

// const GRID_COLORS = ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff']
const GRID_COLORS = ['#ccc', '#888', '#000', '#ccc', '#666', '#000']

const mapItemSprite = {
    type: 'mapItem',
    width: 16,
    height: 16,
    color: 'red',
    onDown(event) {
        // Handle Delete, Rotate, selected
    },
    update() {
        // Snap to grid
        this.advance()
    },
    render() {
        this.draw()
        // Draw the shape from the lines
    }
}

const mapSprite = {
    type: 'map',
    color: '#ff9999',
    width: 512,
    height: 512,
    mode: modes.NEW,
    gridDistance: 16,
    // helper functions
    getItems() {
        return this.children.filter((child) => child.type === 'mapItem')
    },
    toCoord(event) {
        const rect = event.target.getBoundingClientRect()
        // x, y, width, height, top, right, bottom, left
        return {
            x: Math.round(event.clientX * (event.target.width / rect.width) - rect.x - this.x),
            y: Math.round(event.clientY * (event.target.height / rect.height) - rect.y - this.y)
        }
    },

    toObject() {
        const polygons = this.children.filter((child) => child.type === 'polygon').map((polygon) => {
            return polygon.toObject()
        })
        return {
            mirror: this.mirror,
            polygons
        }
    },

    // Events
    onDown(event) {
        if (!this.parent) return
        const coord = this.toCoord(event)
        switch(this.parent.mode) {
            case modes.ADD:
                // Add an item from the toolbar
                break
            case modes.NEW:
                // Add an item from the toolbar
                break;
            case modes.DELETE:
            case modes.NONE:
                break
            default:
                break
        }
    },

    onUp() {
        this.children.filter((view) => view.type === 'polygon').forEach((polygon) => {
            polygon.moveEnded()
        })
    },
    onOver(event) {
        const coord = this.toCoord(event)
        // Move any selected dots to the cursor
        this.children.filter((view) => view.type === 'polygon' && view.dragging)
            .forEach((polygon) => {
                polygon.moveSelected(coord)
            })
    },
    onOut() {
        this.children.filter((view) => view.type === 'polygon').forEach((polygon) => {
            polygon.moveEnded()
        })
    },

    // Overrides
    render(dt) {
        this.draw()
        const context = this.context
        context.save()
        context.strokeStyle = '#999999'
        context.lineWidth = 4

        // Grid markers
        for (let y = 0; y <= this.height / this.gridDistance; y++) {
            for (let x = 0; x <= this.width / this.gridDistance; x++) {
                let gridIndex = 0
                if (x % 4 === 0 && y % 4 === 0) gridIndex = 2
                else if (x % 2 === 0 && y % 2 === 0) gridIndex = 1
                else continue
                context.strokeStyle = GRID_COLORS[gridIndex]
                context.beginPath()
                context.arc(x * this.gridDistance, y * this.gridDistance, 2, 0, 2 * Math.PI)
                context.stroke()
            }
        }
        context.restore()
    },
    collidesWithPointer(pointer) {
        return (
            pointer.x > this.x &&
            pointer.y > this.y &&
            pointer.x < this.x + this.width &&
            pointer.y < this.y + this.height
        )
    }
}

const modeButtonSprite = {
    mode: modes.NONE,
    x: 256 + 16,
    y: 16,
    text: {
        text: 'text',
        color: 'white',
        font: '18px Arial, sans-serif',
        textAlign: 'center',
        y: 24,
        width: 60,
        height: 100
    },
    width: 60,
    height: 60,
    color: 'red',
    onDown() {
        if (!this.parent) return
        this.parent.mode = this.mode
    },
    update() {
        if (!this.parent) return
        this.color = (this.mode === this.parent.mode) ? '#428bca' : '#292b2c'
        this.text = this.mode
    }
}

const editorObject = {
    mode: modes.NEW,
    update(dt) {
        if (!this.initialized) {
            // y o
            // z x
            const yView = Sprite({ // Top
                ...mapSprite,
                name: 'yView',
                color: '#99ff99'
            })
            this.addChild(yView)

            track(yView)

            const modeNewButton = Button({
                ...modeButtonSprite,
                mode: modes.NEW,
                x: 256 + 8,
                y: 520
            })
            this.addChild(modeNewButton)
            
            const modeAddButton = Button({
                ...modeButtonSprite,
                mode: modes.ADD,
                x: 256 + 60 + 8,
                y: 520
            })
            this.addChild(modeAddButton)
            
            const modeNoneButton = Button({
                ...modeButtonSprite,
                mode: modes.NONE,
                x: 256 + 120 + 8,
                y: 520
            })
            this.addChild(modeNoneButton)

            const modeDeleteButton = Button({
                ...modeButtonSprite,
                mode: modes.DELETE,
                x: 256 + 180 + 8,
                y: 520
            })
            this.addChild(modeDeleteButton)

            bindKeys(['1', '2', '3', '4'], (event) => {
                switch(event.key) {
                    case "1":
                        this.mode = modes.NEW
                        break
                    case "2":
                        this.mode = modes.ADD
                        break
                    case "3":
                        this.mode = modes.NONE
                        break
                    case "4":
                        this.mode = modes.DELETE
                        break
                    default:
                        break

                }
            })

            // TODO: Load models from js, Create buttons for each

            this.initialized = true
        }
        
    },
    toObject() {
        return this.getItems().map((item) => item.toObject())
    }
}

export { mapSprite, editorObject }