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
        self.left_eye = []
        self.right_eye = []
        self.mouth = []

        state = ""
        with open(file_name) as handler:
            for line in handler:
                instruction = line.split()
                if len(instruction) == 0 or instruction[0] == "#":
                    continue
                if instruction[0] == "o":
                    state = instruction[1]

                if instruction[0] == "v":
                    vert = np.array(list(map(float, instruction[1:])))
                    self.vertices.append(vert)
                    if state == "left_eye":
                        for index, vertex in enumerate(self.vertices):
                            if (vertex - vert ).all() <= 1e-6 :
                                self.left_eye.append(index)
                    if state == "right_eye":
                        for index, vertex in enumerate(self.vertices):
                            if (vertex - vert).all() <= 1e-6:
                                self.right_eye.append(index)
                    if state == "mouth":
                        for index, vertex in enumerate(self.vertices):
                            if (vertex - vert).all() <= 1e-7:
                                self.mouth.append(index)

                elif instruction[0] == "vn":
                    normal = np.array(list(map(float, instruction[1:])))
                    self.normals.append(normal)
                
                elif instruction[0] == "f":
                    face = tuple(map(lambda x: int(x.split("/")[0]) - 1, instruction[1:]) )
                    face_normal = tuple(map(lambda x: int(x.split("/")[-1]) - 1, instruction[1:]) )
                    self.faces.append(face)
                    self.face_normals.append(face_normal)

        self.left_eye_center = sum(map(lambda x: self.vertices[x], self.left_eye)) / len(self.left_eye)
        self.right_eye_center = sum(map(lambda x: self.vertices[x], self.right_eye)) / len(self.right_eye)
        self.mouth_center = sum(map(lambda x: self.vertices[x], self.mouth)) / len(self.mouth)

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
        