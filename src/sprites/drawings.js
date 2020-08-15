import { Sprite, Button, track } from 'kontra'

const modes = {
    NONE: 'Edit', ADD: 'Add', NEW: 'New', DELETE: 'Delete'
}

const dotSprite = {
    anchor: {x: 0.5, y: 0.5},
    color: '#ffffff',
    width: 10,
    height: 10
}

const polygonSprite = {
    x: 0,
    y: 0,
    addDot(coord) {
        const dot = Sprite(dotSprite)
        dot.position.x = coord.x
        dot.position.y = coord.y
        // else add dot to the current one
        this.addChild(dot)
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
        this.children.forEach((dot, i) => {
            const { x, y } = dot
            if (i === 0) context.moveTo(x, y)
            else context.lineTo(x, y)
        })
        context.fill()
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
    // helper functions
    toCoord: function (event) {
        const rect = event.target.getBoundingClientRect()
        // x, y, width, height, top, right, bottom, left
        return {
            x: Math.round(event.clientX * (event.target.width / rect.width) - rect.x - this.x),
            y: Math.round(event.clientY * (event.target.height / rect.height) - rect.y - this.y)
        }
    },

    toObject: function() {
        const polygons = this.children.map((polygon) => {
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
                    polygon = Sprite(polygonSprite)
                    this.addChild(polygon)
                }
                polygon.addDot(coord)
                break
            case modes.NEW:
                // Start a new polygon at a point
                polygon = Sprite(polygonSprite)
                polygon.addDot(coord)
                this.addChild(polygon)
                // Set the mode to add
                this.parent.mode = modes.ADD
                break;
            case modes.NONE:
            case modes.DELETE:
                break
            default:
                break
        }
    },
    onUp: function() {
        this.selected = false
    },
    onOver: function(event) {
        // console.log('onOver', this.color)
    },
    onOut: function() {
        this.selected = false
    },


    // Overrides
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
            const xView = Sprite(Object.assign({}, drawingSprite, {
                name: 'xView',
                x: 256,
                y: 256
            }))
            this.addChild(xView)
            
            const yView = Sprite(Object.assign({}, drawingSprite, {
                name: 'yView',
                color: '#99ff99'
            }))
            this.addChild(yView)

            const zView = Sprite(Object.assign({}, drawingSprite, {
                name: 'zView',
                y: 256,
                color: '#9999ff'
            }))
            this.addChild(zView)

            track(xView, yView, zView)

            const modeNoneButton = Button(Object.assign({}, modeButtonSprite, {
                mode: modes.NONE,
                x: 256 + 16,
                y: 16
            }))
            this.addChild(modeNoneButton)

            const modeAddButton = Button(Object.assign({}, modeButtonSprite, {
                mode: modes.ADD,
                x: 256 + 128 + 16,
                y: 16,
            }))
            this.addChild(modeAddButton)

            const modeNewButton = Button(Object.assign({}, modeButtonSprite, {
                mode: modes.NEW,
                x: 256 + 16,
                y: 128 + 16
            }))
            this.addChild(modeNewButton)

            const modeDeleteButton = Button(Object.assign({}, modeButtonSprite, {
                mode: modes.DELETE,
                x: 256 + 128 + 16,
                y: 128 + 16
            }))
            this.addChild(modeDeleteButton)



            this.initialized = true
        }
    },
    toObject() {
        return this.children.filter((view) => view.type === 'drawing').map((view) => view.toObject())
    }
}

export { dotSprite, drawingSprite, editorObject }