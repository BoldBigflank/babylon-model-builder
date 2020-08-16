import { Sprite, Button, track, bindKeys } from 'kontra'

const modes = {
    NONE: 'Edit', ADD: 'Add', NEW: 'New', DELETE: 'Delete'
}

// const GRID_COLORS = ['#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff']
const GRID_COLORS = ['#ccc', '#888', '#000', '#ccc', '#666', '#000']

const dotSprite = {
    type: 'dot',
    anchor: {x: 0.5, y: 0.5},
    color: '#ffffff',
    width: 12,
    height: 12,
    onDown() {
        this.selected = true
        this.parent.dragging = true
    },
    onOver() {
        console.log('onOver')
    },
    onUp() {
        this.selected = false
    },

    // Overrides
    collidesWithPointer: function (pointer) {
        if (this.parent.dragging) return false
        const { anchor } = this
        const { x, y, width, height } = this.world
        const adjX = x - (anchor.x * width)
        const adjY = y - (anchor.y * height)
        return (
            pointer.x > adjX &&
            pointer.y > adjY &&
            pointer.x < adjX + width &&
            pointer.y < adjY + height
        )
    },
    update() {
        if (!this.selected) {
            this.x = Math.floor((this.x + 8) / 16) * 16
            this.y = Math.floor((this.y + 8) / 16) * 16
        }
        this.color = (this.last && this.parent.last) ? '#f0ad4e' : '#ffffff'
    }
}

const polygonSprite = {
    type: 'polygon',
    last: false,
    x: 0,
    y: 0,
    addDot(coord) {
        this.children.filter((child) => child.type === 'dot').forEach((dot) => dot.last = false)
        const dot = Sprite(dotSprite)
        this.addChild(dot)
        dot.x = coord.x
        dot.y = coord.y
        if (this.last) dot.last = true
        // else add dot to the current one
        track(dot)
        return dot
    },
    moveSelected(coord) {
        const { x, y } = coord
        this.children.filter((child) => child.type === 'dot' && child.selected).forEach((dot) => {
            dot.x = x
            dot.y = y
        })
    },
    moveEnded() {
        this.children.filter((child) => child.type === 'dot').forEach((dot) => {
            dot.selected = false
        })
        this.dragging = false
    },
    toObject() {
        const points = this.children.map((dot) => {
            return [
                256 - dot.x, 256 - dot.y
            ]
        })
        return points
    },
    render(dt) {
        const context = this.context
        // Draw a polygon around each point
        context.save()
        context.fillStyle = '#ff00ff'
        context.strokeStyle = '#000000'
        context.lineWidth = 3

        context.beginPath()
        let startDot
        this.children.forEach((dot, i) => {
            const { x, y } = dot
            if (i === 0) {
                startDot = dot
                context.moveTo(x, y)
            }
            else context.lineTo(x, y)
        })
        if (startDot) context.lineTo(startDot.x, startDot.y)
        context.fill()
        context.stroke()
        context.restore()

        this.draw()
    }
}

const drawingSprite = {
    type: 'drawing',
    color: '#ff9999',
    width: 256,
    height: 256,
    mirror: false,
    mode: modes.NEW,
    gridDistance: 16,
    // helper functions
    toCoord: function (event) {
        const rect = event.target.getBoundingClientRect()
        // x, y, width, height, top, right, bottom, left
        return {
            x: Math.round(event.clientX * (event.target.width / rect.width) - rect.x - this.x),
            y: Math.round(event.clientY * (event.target.height / rect.height) - rect.y - this.y)
        }
    },

    addPolygon: function() {
        this.children.filter((child) => child.type === 'polygon').forEach((polygon) => polygon.last = false)
        const polygon = Sprite(polygonSprite)
        polygon.last = true
        this.addChild(polygon)
        return polygon
    },

    toObject: function() {
        const polygons = this.children.filter((child) => child.type === 'polygon').map((polygon) => {
            return polygon.toObject()
        })
        return {
            mirror: this.mirror,
            polygons
        }
    },

    // Events
    onDown: function(event) {
        if (!this.parent) return
        const coord = this.toCoord(event)
        let polygon
        switch(this.parent.mode) {
            case modes.ADD:
                // Add a point to an existing polygon
                polygon = this.children[this.children.length - 1]
                if (!polygon) {
                    polygon = this.addPolygon()
                }
                polygon.addDot(coord)
                break
            case modes.NEW:
                // Start a new polygon at a point
                polygon = this.addPolygon()
                polygon.addDot(coord)
                // Set the mode to add
                this.parent.mode = modes.ADD
                break;
            case modes.DELETE:
            case modes.NONE:
                break
            default:
                break
        }
    },

    onUp: function() {
        this.children.filter((view) => view.type === 'polygon').forEach((polygon) => {
            polygon.moveEnded()
        })
    },
    onOver: function(event) {
        const coord = this.toCoord(event)
        // Move any selected dots to the cursor
        this.children.filter((view) => view.type === 'polygon').forEach((polygon) => {
            polygon.moveSelected(coord)
        })
    },
    onOut: function() {
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
    collidesWithPointer: function (pointer) {
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
        font: '20px Arial, sans-serif',
        textAlign: 'center',
        y: 40,
        width: 100,
        height: 100
    },
    width: 96,
    height: 96,
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
            const xView = Sprite({
                ...drawingSprite,
                name: 'xView',
                x: 256,
                y: 256
            })
            this.addChild(xView)
            
            const zView = Sprite({
                ...drawingSprite,
                name: 'zView',
                y: 256,
                color: '#9999ff'
            })
            this.addChild(zView)
            
            const yView = Sprite({
                ...drawingSprite,
                name: 'yView',
                color: '#99ff99'
            })
            this.addChild(yView)

            track(xView, yView, zView)

            const modeNewButton = Button({
                ...modeButtonSprite,
                mode: modes.NEW,
                x: 256 + 16,
                y: 16
            })
            this.addChild(modeNewButton)
            
            const modeAddButton = Button({
                ...modeButtonSprite,
                mode: modes.ADD,
                x: 256 + 128 + 16,
                y: 16,
            })
            this.addChild(modeAddButton)
            
            const modeNoneButton = Button({
                ...modeButtonSprite,
                mode: modes.NONE,
                x: 256 + 16,
                y: 128 + 16
            })
            this.addChild(modeNoneButton)

            const modeDeleteButton = Button({
                ...modeButtonSprite,
                mode: modes.DELETE,
                x: 256 + 128 + 16,
                y: 128 + 16
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

            this.initialized = true
        }
        
    },
    toObject() {
        return this.children.filter((view) => view.type === 'drawing').map((view) => view.toObject())
    }
}

export { dotSprite, drawingSprite, editorObject }