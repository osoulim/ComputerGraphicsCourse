import pygame
from pygame.locals import *

from OpenGL.GL import *
from OpenGL.GLU import *

import numpy as np 

def point_sum(p1, p2):
    return (p1[0] + p2[0], p1[1] + p2[1], p1[2] + p2[2])

class Obj:
    def __init__(self, file_name):
        self.vertices = [ ]
        self.faces = []
        self.normals = []
        self.position = np.array([0, 0, 0])

        with open(file_name) as handler:
            for line in handler:
                instruction = line.split()
                if len(instruction) == 0 or instruction[0] == "#":
                    continue
                if instruction[0] == "v":
                    vert = np.array(list(map(float, instruction[1:])))
                    self.vertices.append(vert)
                
                elif instruction[0] == "vn":
                    normal = np.array(list(map(float, instruction[1:])))
                    self.normals.append(normal)
                
                elif instruction[0] == "f":
                    face = tuple(map(lambda x: int(x.split("/")[0]) - 1, instruction[1:]) )
                    self.faces.append(face)

    def draw(self):
        glBegin(GL_TRIANGLES)
        for face in self.faces:
            for vertex_id in face:
                glVertex3fv(self.vertices[vertex_id] + self.position)
        glEnd()

    def export_faces(self):
        return list(map(lambda x: np.array(list(map(lambda y: self.vertices[y], x))), self.faces))
        


if __name__ == "__main__":
    pass
    pygame.init()
    display = (1280,720)
    pygame.display.set_mode(display, DOUBLEBUF|OPENGL)
    gluPerspective(45, (display[0]/display[1]), 0.1, 500.0)

    car = Obj("models/porshe.obj")
    car.position = np.array([0, 0, 0])
    camera_position = np.array([0, 0, -50])
    camera_up = np.array([0, 1, 0])
    gluLookAt(*camera_position, *car.position, *camera_up)
    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                quit()
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_LEFT:
                    glTranslatef(-0.5,0,0)
                if event.key == pygame.K_RIGHT:
                    glTranslatef(0.5,0,0)

                if event.key == pygame.K_UP:
                    glTranslatef(0,1,0)
                if event.key == pygame.K_DOWN:
                    glTranslatef(0,-1,0)

            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 4:
                    glTranslatef(0,0,1.0)

                if event.button == 5:
                    glTranslatef(0,0,-1.0)

        glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT)
        car.draw()
        pygame.display.flip()
        pygame.time.wait(10)
