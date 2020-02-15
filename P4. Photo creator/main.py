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
import cv2
import math

pygame.init()
viewport = (800,800)
pygame.display.set_mode(viewport, OPENGL | DOUBLEBUF)
glMatrixMode(GL_PROJECTION)
glLoadIdentity()
gluPerspective(90, (viewport[0]/viewport[1]), 0.1, 500.0)
glMatrixMode(GL_MODELVIEW)

obj = Obj("models/porshe.obj")
camera_up = np.array([0, 1, 0])

glEnable(GL_CULL_FACE);  
glCullFace(GL_BACK);  


glEnable(GL_LIGHTING)
glEnable(GL_LIGHT0)
glLightfv(GL_LIGHT0, GL_POSITION, (0, 20, 0, 1))
# glMaterialfv(GL_FRONT, GL_AMBIENT, (0, 0.8, 0.8, 1))
glShadeModel(GL_FLAT)



steps = 20
distance_range = range(10, 16, 2)


for distance in distance_range:
    for i in range(steps+1):
        camera_position = np.array([math.cos(i/steps * 2 * math.pi), 0.5, math.sin(i /steps * 2 * math.pi)]) * distance
        glLoadIdentity()
        gluLookAt(*camera_position, *obj.position, *camera_up)
        glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT)
        obj.draw()
        pygame.display.flip()
        pygame.time.wait(10)
        screen = glReadPixels(0, 0, *viewport, GL_BGR, type=GL_FLOAT)
        screen = (screen * 255).astype(int)[::-1]
        cv2.imwrite("output/%d-%d.png" % (distance, i), screen)
    