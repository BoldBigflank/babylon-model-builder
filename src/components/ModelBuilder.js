import React from 'react';
import { Scene, Engine, ArcRotateCamera, Vector3, Color3, HemisphericLight, Mesh, StandardMaterial } from 'babylonjs';
import { init, GameObject, GameLoop, initPointer, initKeys } from 'kontra'
import { editorObject } from './ModelBuilderSprites'
import { intersectDrawings } from '../utils/meshGenerator'
import '../styles/ModelBuilder.css'


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

        const mesh = intersectDrawings(modelObject, this.shapeMat)
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