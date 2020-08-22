import React from 'react';
import { Scene, Engine, ArcRotateCamera, Vector3, Color3, HemisphericLight, Mesh, CSG, MeshBuilder, StandardMaterial } from 'babylonjs';
import { init, GameObject, GameLoop, initPointer, initKeys } from 'kontra'
import { editorObject } from './ModelBuilderSprites'
import '../styles/ModelBuilder.css'

const GRID_TO_UNITS = 1 / 3

const scaledVector3 = (x, y, z, scale) => {
    scale = scale || GRID_TO_UNITS
    return new Vector3(x * scale, y * scale, z * scale)
}


export default class ModelBuilder extends React.Component {
    constructor(props) {
        super(props);
        
        this.state = {
            
        }
        this.sprites = []
    }
    
    componentDidMount() {
        // Start KontraJS stuff
        init('drawCanvas')
        const pointer = initPointer()
        pointer.radius = .1
        initKeys()
        
        const editor = GameObject(editorObject)
        editor.ModelUpdated = () => {this.renderModel()}
        this.sprites.push(editor)
        this.editorView = editor

        // The KontraJS GameLoop
        this.loop = GameLoop({
            update: (dt) => this.sprites.forEach((s) => s.update()),
            render: (dt) => this.sprites.forEach((s) => s.render())
        })
        this.loop.start()

        // Start BabylonJS stuff
        const renderCanvas = document.getElementById('renderCanvas')
        this.engine = new Engine(
            renderCanvas,
            true,
            { preserveDrawingBuffer: true, stencil: true }
        );
        
        const createScene = () => {
            const scene = new Scene(this.engine)
            const camera = new ArcRotateCamera('camera1',
             Math.PI * 3 / 2, // a
             Math.PI / 4, // b
             24, // radius
             new Vector3(0, 4, 0), scene) // target
            camera.attachControl(renderCanvas, false)
            const sphere = Mesh.CreateSphere('sphere1', 16, 2, scene, false, Mesh.FRONTSIDE);
            sphere.position.x = 4;
            const light = new HemisphericLight('light1', Vector3.Up(), scene)
            light.diffuse = new Color3(1, 0.9, 0.8);
            light.specular = new Color3(1, 1, 1);
            light.groundColor = new Color3(.3, .2, .1);
            const ground = Mesh.CreateGround('ground1', 6, 6, 2, scene, false);
            ground.material = this.groundMat

            return scene;
        }
        
        const scene = createScene()
        this.scene = scene
        this.shapeMat = new StandardMaterial("Material-Shape", scene);
        this.groundMat = new StandardMaterial("Material-Ground", scene);
        this.groundMat.diffuseColor = new Color3(.3, .2, .1)

        this.engine.runRenderLoop(() => scene.render())
    }

    renderModel() {
        if (this.mesh) this.mesh.dispose()
        const modelObject = this.editorView.toObject()
        const renderOutput = JSON.stringify(modelObject)
        // Check the model

        const mesh = this.intersectDrawings(modelObject, this.shapeMat)
        if (mesh) {
            this.scene.addMesh(mesh)
    
            mesh.position = new Vector3(0, 4, 0)
            mesh.scaling = new Vector3(8, 8, 8)
            this.mesh = mesh
        }
        
        this.setState({
            renderOutput
        })
    }

    // Input an array of polygons, an axis and a scene
    // Return a Mesh made by extruding each polygon along that axis
    extrudePolygons = (polygons) => {
        const meshes = []
        // Assume a max grid size of 64x64

        // Make a path from 0.5 to -0.5 on the given axis
        // Reversed on x and y so we draw top down view
        // and right side view
        const path = [
            scaledVector3(0, 0, -1, 1 / 2),
            scaledVector3(0, 0, 1, 1 / 2)
        ]

        polygons.forEach((polygon) => {
            const shape = polygon.map((point) => {
                const [x, y] = point
                const z = 0
                return scaledVector3(x - 32, y - 32, z, 1 / 64) // Normalize the polygon
            })
            shape.push(shape[0])

            const extrusion = MeshBuilder.ExtrudeShape('star', {
                shape,
                path,
                cap: Mesh.CAP_ALL,
                updatable: true
            })
            meshes.push(extrusion)
        })
        // Merge the meshes
        const newMesh = Mesh.MergeMeshes(meshes, true)
        return newMesh
    }

    // Input an array of drawings, a material and a scene
    // Return a Mesh made by intersecting the meshes made by extruding each drawing
    intersectDrawings = (modelObject, shapeMat) => {
        const { drawings, color } = modelObject
        const [ r, g, b ] = color.split(',')
        shapeMat.diffuseColor = new Color3(r, g, b)
        const axes = ['x', 'y', 'z']
        const extrudeMeshes = []
        // Make a mesh from each of the shapes
        drawings.forEach((drawing, i) => {
            if (!drawing.polygons.length) return // Don't extrude meshes
            if (drawing.mirror) {
                const mirrorPolygons = []
                drawing.polygons.forEach((polygon) => {
                    const mirrorPolygon = []
                    for (let i = polygon.length - 1; i >= 0; i--) {
                        const [x, y] = polygon[i]
                        mirrorPolygon.push([64 - x, y])
                    }
                    mirrorPolygons.push(mirrorPolygon)
                })
                drawing.polygons.push(...mirrorPolygons)
            }
            const extrudeMesh = this.extrudePolygons(drawing.polygons)
            // Rotate based on the axis we're making
            if (axes[i] === 'x') extrudeMesh.rotate(Vector3.Up(), -Math.PI / 2)
            if (axes[i] === 'y') extrudeMesh.rotate(Vector3.Right(), Math.PI / 2)
            
            extrudeMeshes.push(extrudeMesh)
        })
        if (!extrudeMeshes.length) return
        // Make CSG from each
        // Combine using intersect
        let resultCSG = null
        extrudeMeshes.forEach((extrudeMesh) => {
            const shapeCSG = CSG.FromMesh(extrudeMesh)
            if (!resultCSG) resultCSG = shapeCSG
            else {
                resultCSG.intersectInPlace(shapeCSG)
            }
        })

        const resultMesh = resultCSG.toMesh('Result-Mesh', shapeMat, null, true)
        extrudeMeshes.forEach((mesh) => mesh.dispose())
        return resultMesh
    }


    render() {
        return (
            <div className="ModelBuilder">
                <p>Editor</p>
                <div className="toolbar">Toolbar</div>
                <div className="Editor">
                    <div className="canvasContainer">
                        <canvas id="drawCanvas" width={512} height={512}></canvas>
                    </div>
                    <div className="canvasContainer">
                        <canvas id="renderCanvas" width={512} height={512} ></canvas>
                    </div>
                </div>
                <div className="Output">
                    <p>Output</p>
                    <textarea value={this.state.renderOutput}></textarea>
                </div>
            </div>
        )
    }
}