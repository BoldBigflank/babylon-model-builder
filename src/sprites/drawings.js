import { Sprite } from 'kontra'

const dotSprite = {
    anchor: {x: 0.5, y: 0.5},
    parent: null,
    color: '#ffffff',
    width: 10,
    height: 10
}

const viewSprite = {
    color: '#ff9999',
    width: 256,
    height: 256,
    polygons: undefined,
    
    // helper functions
    getLastPolygon: function() {
        if (this.polygons.length > 1) return []
        return this.polygons[this.polygons.length-1]
    },

    toCoord: function (event) {
        const rect = event.target.getBoundingClientRect()
        // x, y, width, height, top, right, bottom, left
        return {
            x: Math.round(event.clientX * (event.target.width / rect.width) - rect.x - this.x),
            y: Math.round(event.clientY * (event.target.height / rect.height) - rect.y - this.y)
        }
    },

    getPolygons: function() {
        const result = this.children.map((child) => {
            return [
                256 - child.position.x,
                256 - child.position.y
            ]
        })
        return {
            shouldMirror: false,
            points: [result]
        }
    },

    // Events
    onDown: function(event) {
        // Create a point at the current location
        console.log('onDown', event)
        const coord = this.toCoord(event)
        const polygon = this.getLastPolygon().push(coord)
        console.log(this.color, coord)
        const dot = new Sprite(dotSprite)
        dot.position.x = coord.x
        dot.position.y = coord.y
        this.addChild(dot)
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
    },
    update: function (dt) {
        if (!this.polygons) this.polygons = [[]]
        this.advance()
    },

    render: function(dt) {
        if (!this.polygons) this.polygons = [[]]
        const  { context } = this
        this.draw()
        context.save()
        context.fillStyle = '#ff00ff'
        context.strokeStyle = '#000000'
        context.lineWidth = 3
        this.polygons.forEach((polygon) => {
            context.beginPath()
            // Fill the polygon
            polygon.forEach((points, i) => {
                const { x, y } = points
                if (i === 0) context.moveTo(x, y)
                else context.lineTo(x, y)
            })
            context.fill()
            // TODO: Draw the points
            context.restore()
            
        })
        if (this.selected) {

        }
    }

}

export { dotSprite, viewSprite }