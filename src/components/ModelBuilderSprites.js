import { Sprite, Button, track, untrack, bindKeys, on, emit } from 'kontra'

const modes = {
    NONE: 'Edit', ADD: 'Add', NEW: 'New', DELETE: 'Del'
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
        emit('dot:clicked', this)
    },
    onUp() {
        this.parent.dragging = false
    },

    // Overrides
    collidesWithPointer(pointer) {
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
        if (!this.parent.dragging) {
            this.x = Math.floor((this.x + 8) / 16) * 16
            this.y = Math.floor((this.y + 8) / 16) * 16
        }
        this.color = (this.selected) ? '#f0ad4e' : '#ffffff'
    },
    toObject() {
        this.update()
        return [
            Math.floor(this.x / 4),
            Math.floor(64 - (this.y / 4))
        ]
    }
}

const polygonSprite = {
    type: 'polygon',
    last: false,
    x: 0,
    y: 0,
    getDots() {
        return this.children.filter((child) => child.type === 'dot')
    },
    addDot(coord) {
        // find the selected dot before adding one
        const selectedDotIndex = this.children.findIndex((child) => child.type === 'dot' && child.selected)
        const dot = Sprite({
            ...dotSprite
        })
        this.addChild(dot)
        const dotIndex = this.children.findIndex((child) => child === dot)
        dot.x = coord.x
        dot.y = coord.y
        // if (this.last) dot.last = true
        // else add dot to the current one
        track(dot)

        // Rearrange the children so that dot's after the selected one
        if (selectedDotIndex !== -1 && dotIndex > 0) {
            this.children.splice(dotIndex, 1)
            this.children.splice(selectedDotIndex + 1, 0, dot)
        }

        return dot
    },

    selectDot(selectedDot) {
        this.children
            .filter((child) => child.type === 'dot')
            .forEach((dot) => {
                dot.selected = (dot === selectedDot)
            })
        this.dragging = true
    },

    hasSelected() {
        const dot = this.children.find((child) => child.type === 'dot' && child.selected)
        return (dot !== undefined)
    },
    
    moveSelected(coord) {
        const { x, y } = coord
        this.children
            .filter((child) => child.type === 'dot' && child.selected)
            .forEach((dot) => {
                dot.x = x
                dot.y = y
            })
    },
    moveEnded() {
        // this.children.filter((child) => child.type === 'dot').forEach((dot) => {
        //     dot.selected = false
        // })
        this.dragging = false
    },
    toObject() {
        const points = this.children.map((dot) => dot.toObject())
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
    getPolygons() {
        return this.children.filter((child) => child.type === 'polygon')
    },
    toCoord(event) {
        const rect = event.target.getBoundingClientRect()
        // x, y, width, height, top, right, bottom, left
        return {
            x: Math.round(event.clientX * (event.target.width / rect.width) - rect.x - this.x),
            y: Math.round(event.clientY * (event.target.height / rect.height) - rect.y - this.y)
        }
    },

    addPolygon() {
        this.children
            .filter((child) => child.type === 'polygon')
            .forEach((polygon) => polygon.last = false)
        const polygon = Sprite(polygonSprite)
        polygon.last = true
        this.addChild(polygon)
        return polygon
    },
    
    selectDot(selectedDot) {
        this.children
            .filter((child) => child.type === 'polygon')
            .forEach((polygon) => {
                polygon.selectDot(selectedDot)
            })
    },

    toObject() {
        const polygons = this.getPolygons().map((polygon) => {
            return polygon.toObject()
        })
        const object = { polygons }
        if (this.mirror) object.mirror = true
        return object
    },

    // Events
    onDown(event) {
        if (!this.parent) return
        const coord = this.toCoord(event)
        let polygon
        switch(this.parent.mode) {
            case modes.ADD:
                // Add a point to an existing polygon
                polygon = this.children
                    .find((child) => child.type === 'polygon' && child.hasSelected())
                if (!polygon) {
                    polygon = this.addPolygon()
                }
                emit('dot:clicked', polygon.addDot(coord))
                break
            case modes.NEW:
                // Start a new polygon at a point
                polygon = this.addPolygon()
                emit('dot:clicked', polygon.addDot(coord))
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

    onUp() {
        this.children.filter((view) => view.type === 'polygon').forEach((polygon) => {
            polygon.moveEnded()
        })
        this.parent.ModelUpdated()
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
        this.parent.ModelUpdated()
    },

    // Overrides
    render(dt) {
        this.draw()
        const context = this.context
        
        if (this.mirror) {
            context.fillStyle = 'black'
            context.fillRect(128, 0, 128, 256)
        }
        
        context.save()
        // Mirror
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

const colorPickerSprite = {
    type: 'colorPicker',
    r: 255, 
    g: 255,
    b: 255,
    width: 256,
    height: 128,
    color: '#333',
    toCoord(event) {
        const rect = event.target.getBoundingClientRect()
        // x, y, width, height, top, right, bottom, left
        return {
            x: Math.round(event.clientX * (event.target.width / rect.width) - rect.x - this.x),
            y: Math.round(event.clientY * (event.target.height / rect.height) - rect.y - this.y)
        }
    },
    onDown(event) {
        const coord = this.toCoord(event)
        if (coord.y > 96) { // B
            this.b = coord.x
        } else if (coord.y > 64) { // G
            this.g = coord.x
        } else if (coord.y > 32) { // R
            this.r = coord.x
        }
        this.parent.ModelUpdated()
    },
    render(dt) {
        const ctx = this.context
        ctx.save()
        
        ctx.fillStyle = `rgb(${this.r}, ${this.g}, ${this.b})`
        ctx.fillRect(0, 0, 256, 32)
        
        ctx.fillStyle = 'red'
        ctx.fillRect(0, 32, 256, 32)
        ctx.fillStyle = 'green'
        ctx.fillRect(0, 64, 256, 32)
        ctx.fillStyle = 'blue'
        ctx.fillRect(0, 96, 256, 32)

        // Indicator circles
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 8
        ctx.beginPath()
        ctx.arc(this.r, 32 + 16, 12, 0, 2 * Math.PI)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.arc(this.g, 64 + 16, 12, 0, 2 * Math.PI)
        ctx.stroke()
        
        ctx.beginPath()
        ctx.arc(this.b, 96 + 16, 12, 0, 2 * Math.PI)
        ctx.stroke()
        ctx.restore()
    },
    toObject() {
        const r = Math.floor(this.r / 2.56) / 100
        const g = Math.floor(this.g / 2.56) / 100
        const b = Math.floor(this.b / 2.56) / 100

        return `${r},${g},${b}`
    }
}

const mirrorButtonSprite = {
    mirror: false,
    width: 16,
    height: 16,
    color: 'red',
    drawingName: '',
    onDown() {
        this.mirror = !this.mirror
        if (this.drawing) {
            this.drawing.mirror = this.mirror
            this.parent.ModelUpdated()
        }
    },
    update() {
        if (!this.drawing) {
            this.drawing = this.parent.children.find((child) => child.name === this.drawingName)
        }
        this.color = this.mirror ? '#428bca' : '#292b2c'
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
            
            // I imagine the y is looking in the direction of -y
            // I imagine the x is looking in the direction of -x
            // I imagine the z is looking in the direction of +z

            const xView = Sprite({ // Side
                ...drawingSprite,
                name: 'xView',
                x: 256,
                y: 256
            })
            this.addChild(xView)
            
            const yView = Sprite({ // Top
                ...drawingSprite,
                name: 'yView',
                color: '#99ff99'
            })
            this.addChild(yView)

            const zView = Sprite({ // Front
                ...drawingSprite,
                name: 'zView',
                y: 256,
                color: '#9999ff'
            })
            this.addChild(zView)
            
            track(xView, yView, zView)

            const modeNewButton = Button({
                ...modeButtonSprite,
                mode: modes.NEW,
                x: 256 + 8,
                y: 16
            })
            this.addChild(modeNewButton)
            
            const modeAddButton = Button({
                ...modeButtonSprite,
                mode: modes.ADD,
                x: 256 + 60 + 8,
                y: 16,
            })
            this.addChild(modeAddButton)
            
            const modeNoneButton = Button({
                ...modeButtonSprite,
                mode: modes.NONE,
                x: 256 + 120 + 8,
                y: 16
            })
            this.addChild(modeNoneButton)

            const modeDeleteButton = Button({
                ...modeButtonSprite,
                mode: modes.DELETE,
                x: 256 + 180 + 8,
                y: 16
            })
            this.addChild(modeDeleteButton)

            this.addChild(Button({
                ...mirrorButtonSprite,
                drawingName: 'xView',
                x: 256 + 8 + 16,
                y: 96 + 16
            }))
            
            this.addChild(Button({
                ...mirrorButtonSprite,
                drawingName: 'yView',
                x: 256 + 8,
                y: 96
            }))

            this.addChild(Button({
                ...mirrorButtonSprite,
                drawingName: 'zView',
                x: 256 + 8,
                y: 96 + 16
            }))





            const colorPicker = Sprite({
                ...colorPickerSprite,
                x: 256,
                y: 128
            })
            this.addChild(colorPicker)
            track(colorPicker)

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

            // Child Events
            on('dot:clicked', (dot) => {
                if (this.mode === modes.DELETE) {
                    untrack(dot)
                    const polygon = dot.parent
                    polygon.removeChild(dot)
                    if (polygon.getDots().length === 0)
                    polygon.parent.removeChild(polygon)
                    dot.ttl = 0
                } else {
                    this.children
                        .filter((view) => view.type === 'drawing')
                        .forEach(drawing => drawing.selectDot(dot))
                }

            })

            this.initialized = true
        }
        
    },
    getDrawings() {
        return this.children.filter((view) => view.type === 'drawing')
    },
    toObject() {
        const drawings = this.getDrawings().map((drawing) => drawing.toObject())
        const color = this.children.find((child) => child.type === 'colorPicker').toObject()
        return {
            color,
            drawings
        }
    }
}

export { dotSprite, drawingSprite, editorObject }