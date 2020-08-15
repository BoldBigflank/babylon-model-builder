import React from 'react';
import { Scene, Engine, ArcRotateCamera, Vector3, HemisphericLight, Mesh, CSG, MeshBuilder, StandardMaterial } from 'babylonjs';
import { init, Sprite, GameLoop, initPointer, track } from 'kontra'
import { viewSprite } from '../sprites/drawings'
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
        let { canvas, context } = init('drawCanvas')
        initPointer()
        
        // y o
        // z x
        const xView = Sprite(viewSprite)
        xView.position.x = 256
        xView.position.y = 256
        
        const yView = Sprite(viewSprite)
        yView.color = '#99FF99'
        
        const zView = Sprite(viewSprite)
        zView.position.y = 256
        zView.color = '#9999FF'
        track(xView, yView, zView)

        this.sprites.push(xView, yView, zView)
        this.editorViews = {
            xView, yView, zView
        }
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
            const camera = new ArcRotateCamera('camera1', 0, Math.PI / 4, 24, Vector3.Zero(), scene)
            camera.setTarget(Vector3.Zero())
            camera.attachControl(renderCanvas, false)
            // const sphere = Mesh.CreateSphere('sphere1', 16, 2, scene, false, Mesh.FRONTSIDE);
            // sphere.position.y = 1;
            new HemisphericLight('light1', Vector3.Up(), scene)
            Mesh.CreateGround('ground1', 6, 6, 2, scene, false);
            return scene;
        }
        
        const scene = createScene()
        this.scene = scene
        this.shapeMat = new StandardMaterial("Material-Shape", scene);

        this.engine.runRenderLoop(() => scene.render())
    }

    renderModel() {
        if (this.mesh) this.mesh.dispose()
        // TODO: Gather the 3 axis canvases
        // TODO: Build and render a babylonjs model
        const xPolygons = this.editorViews.xView.getPolygons()
        const yPolygons = this.editorViews.yView.getPolygons()
        const zPolygons = this.editorViews.zView.getPolygons()
        console.log('renderModel', xPolygons)
        // [[{x,y}, {x,y}, {x,y}], [{x,y}, {x,y}, {x,y}]]
        
        // Make 3 models by extruding each drawing
        // Convert to 
        const mesh = this.createPuzzle([xPolygons, zPolygons, yPolygons], this.shapeMat, this.scene)
        mesh.position.y = 4
        mesh.scaling = new Vector3(8, 8, 8)
        this.mesh = mesh

    }

    createPuzzle(shapeArrays, shapeMat, scene) {
        var axes = ['x', 'z', 'y']
        var shapeMeshes = []
        var shapeCSGs = []
        var resultMeshes = []
        // Make a mesh from each of the shapeArrays
        shapeArrays.forEach((shape, i) => {
            var shapeMesh = this.CreatePuzzleShape(shape, axes[i], scene)
            shapeMeshes.push(shapeMesh)
        })
        // Make CSG from each
        // Combine using intersect
        let resultCSG = null
        shapeMeshes.forEach((shapeMesh) => {
            let shapeCSG = CSG.FromMesh(shapeMesh)
            if (!resultCSG) resultCSG = shapeCSG
            else {
                resultCSG.intersectInPlace(shapeCSG)
            }
        })

        const resultMesh = resultCSG.toMesh('Result-Mesh', this.shapeMat, scene, true)
        shapeMeshes.forEach((mesh) => mesh.dispose())
        return resultMesh

        // Use a box to split it into four chunks
        var topStamp = MeshBuilder.CreateBox('Box-Stamp', {
            size: 0.52
        }, scene)

        var positions = [
            scaledVector3(0.25, 0.25, 0.25, 1),
            scaledVector3(-0.25, 0.25, -0.25, 1),
            scaledVector3(0.25, -0.25, -0.25, 1),
            scaledVector3(-0.25, -0.25, 0.25, 1)
        ]


        positions.forEach((pivotPoint, i) => {
            topStamp.position = pivotPoint
            let shapeCSG = resultCSG.intersect(CSG.FromMesh(topStamp))
            var shapeMesh = shapeCSG.toMesh('Grabbable-Puzzle-' + i, shapeMat, scene, true)
            // Move the pivot to teh right spot
            shapeMesh.setPivotPoint(pivotPoint)
            resultMeshes.push(shapeMesh)
        })
        // resultMeshes.push(resultCSG.toMesh('Grabbable-Test-Shape', shapeMat, scene, false))
        topStamp.dispose()
        shapeMeshes.forEach((mesh) => mesh.dispose())
        // Every puzzle will do the same four blocks
        // return an array of meshes with their pivot point set
        return resultMeshes
    }

    
    CreatePuzzleShape = (shapeObject, axis, scene) => {
        let puzzle = shapeObject.points
        axis = axis || 'y'
        let meshes = []
        // Assume a max grid size of 32x32

        // Make a path from -0.5 to 0.5 on the given axis
        let path = []
        let pathX = (axis === 'x') ? 1 : 0
        let pathY = (axis === 'y') ? 1 : 0
        let pathZ = (axis === 'z') ? 1 : 0
        path.push(scaledVector3(-pathX, -pathY, -pathZ, 1 / 2))
        path.push(scaledVector3(pathX, pathY, pathZ, 1 / 2))

        puzzle.forEach((puzzleShape) => {
            let shape = []
            puzzleShape.push(puzzleShape[0]) // Add the first to the end
            puzzleShape.forEach((point) => {
                const [x, y] = point
                let z = 1
                shape.push(scaledVector3(x - 128, y - 128, z, 1 / 256))
            })
            var extrusion = MeshBuilder.ExtrudeShape("star", {
                shape: shape,
                path: path,
                cap: Mesh.CAP_ALL,
                updatable: true
            }, scene);
            meshes.push(extrusion)
        })
        // Merge the meshes
        var newMesh = Mesh.MergeMeshes(meshes, true);
        // newMesh.scaling = 32
        return newMesh
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
                    <canvas id="renderCanvas" width={512} height={512} ></canvas><br/>
                    <button onClick={() => this.renderModel()}>Render</button>
                </div>
                <div className="Output">
                    <p>Output</p>
                    <textarea></textarea>
                </div>
            </div>
        )
    }
}