import { Sprite } from 'kontra'

const modes = {
    NEW: 0, ADD: 1
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

const viewSprite = {
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
        const coord = this.toCoord(event)
        let polygon
        if (this.mode === modes.NEW) {
            // Start a new polygon
            polygon = Sprite(polygonSprite)
            this.addChild(polygon)
            this.mode = modes.ADD
        } else if (this.mode === modes.ADD) {
            // Add a point to the last polygon
            polygon = this.children[this.children.length-1]
        }
        polygon.addDot(coord)
        
        
        this.selected = true
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

export { dotSprite, viewSprite }