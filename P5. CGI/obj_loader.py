import pygame
from pygame.locals import *

from OpenGL.GL import *
from OpenGL.GLU import *

import numpy as np 


class Obj:
    def __init__(self, file_name):
        self.vertices = [ ]
        self.faces = []
        self.face_normals = []
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
                    face_normal = tuple(map(lambda x: int(x.split("/")[-1]) - 1, instruction[1:]) )
                    self.faces.append(face)
                    self.face_normals.append(face_normal)

    def draw(self):
        for normals, face in zip(self.face_normals, self.faces):
            glBegin(GL_TRIANGLES if len(face) == 3 else GL_QUADS)
            glNormal3fv(sum(map(lambda x: self.normals[x], normals)) / len(normals) )
            for vertex_id in face:
                glVertex3fv(self.vertices[vertex_id] + self.position)
            glEnd()

    def show_node(self, index):
        glPushAttrib(GL_CURRENT_BIT)
        glBegin(GL_POINTS)
        glColor3f(1, 0, 0)
        glVertex3fv(self.vertices[index])
        glEnd()
        glPopAttrib()
        