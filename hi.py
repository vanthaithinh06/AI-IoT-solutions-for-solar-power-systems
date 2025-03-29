import sys
#sys.path.append('PyQt5')
import trimesh
import pyrender
from PyQt5.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QPushButton, QFileDialog, QWidget, QMessageBox

class MainWindow(QMainWindow):
    def __init__(self):
        super(MainWindow, self).__init__()
        self.setWindowTitle("3D Model Viewer")
        self.setGeometry(100, 100, 800, 600)

        # Main widget
        self.main_widget = QWidget()
        self.setCentralWidget(self.main_widget)

        # Layout
        self.layout = QVBoxLayout()
        self.main_widget.setLayout(self.layout)

        # Load model button
        self.load_button = QPushButton("Load 3D Model")
        self.load_button.clicked.connect(self.load_model)
        self.layout.addWidget(self.load_button)

    def load_model(self):
        # Open file dialog to select a 3D model
        filepath, _ = QFileDialog.getOpenFileName(self, "Open 3D Model", "", "3D Files (*.obj *.stl *.ply *.glb)")
        if filepath:
            try:
                # Load the 3D model
                scene_trimesh = trimesh.load(filepath)
                scene = pyrender.Scene()

                # Check if it's a Scene or Trimesh
                if isinstance(scene_trimesh, trimesh.Scene):
                    for name, mesh in scene_trimesh.geometry.items():
                        mesh_with_texture = pyrender.Mesh.from_trimesh(mesh)
                        scene.add(mesh_with_texture)
                else:
                    mesh_with_texture = pyrender.Mesh.from_trimesh(scene_trimesh)
                    scene.add(mesh_with_texture)

                # Add light
                light = pyrender.DirectionalLight(color=[1.0, 1.0, 1.0], intensity=2.0)
                scene.add(light, pose=[[1, 0, 0, 0],
                                       [0, 1, 0, 0],
                                       [0, 0, 1, 2],
                                       [0, 0, 0, 1]])

                # Open pyrender Viewer
                print("Opening Pyrender Viewer...")
                pyrender.Viewer(scene, use_raymond_lighting=True)

            except Exception as e:
                # Show error message if loading fails
                QMessageBox.critical(self, "Error", f"Failed to load 3D model:\n{e}")


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec_())
