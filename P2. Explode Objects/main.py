# Basic OBJ file viewer. needs objloader from:
#  http://www.pygame.org/wiki/OBJFileLoader
# LMB + move: rotate
# RMB + move: pan
# Scroll wheel: zoom in/out
import sys, pygame
import numpy as np
from pygame.locals import *
from pygame.constants import *
from OpenGL.GL import *
from OpenGL.GLU import *

from obj_loader import Obj

def draw_face(face):
    glBegin(GL_TRIANGLES)
    for vertex in face:
        glVertex3fv(vertex)
    glEnd()



pygame.init()
viewport = (1280,720)
pygame.display.set_mode(viewport, OPENGL | DOUBLEBUF)
gluPerspective(75, (viewport[0]/viewport[1]), 0.1, 500.0)


obj = Obj("models/porshe.obj")
faces = obj.export_faces()
bomb_pos = np.array([0, 0, 0])
speed = 3
camera_position = np.array([0, 0, -30])
camera_up = np.array([0, 1, 0])
gluLookAt(*camera_position, *obj.position, *camera_up)
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
    # obj.draw()
    for face in faces:
        center = sum(face)/len(face)
        vec = - bomb_pos + center
        norm = vec / np.linalg.norm(vec)
        for vertex in face:
            vertex += norm * speed 
        draw_face(face)
    pygame.display.flip()
    pygame.time.wait(10)

