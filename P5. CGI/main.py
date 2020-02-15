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
import dlib
from imutils import face_utils

pygame.init()
viewport = (800,800)
pygame.display.set_mode(viewport, OPENGL | DOUBLEBUF)
glMatrixMode(GL_PROJECTION)
glLoadIdentity()
gluPerspective(90, (viewport[0]/viewport[1]), 0.1, 500.0)
glMatrixMode(GL_MODELVIEW)

obj = Obj("models/head.obj")
camera_up = np.array([0, 1, 0])

glEnable(GL_CULL_FACE);  
glCullFace(GL_BACK);  


glEnable(GL_LIGHTING)
glEnable(GL_LIGHT0)
glLightfv(GL_LIGHT0, GL_POSITION, (0, 0, -5, 0))
# glMaterialfv(GL_FRONT, GL_AMBIENT, (0, 0.8, 0.8, 1))
glShadeModel(GL_FLAT)

glEnable(GL_DEPTH_TEST)
camera_position = np.array([0, 0, -1]) 
glLoadIdentity()
gluLookAt(*camera_position, *obj.position, *camera_up)

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("models/shape_predictor_68_face_landmarks.dat")

cap = cv2.VideoCapture(0)

point_index = 0
while cv2.waitKey(30) != ord('q'):
    
    ret, frame = cap.read()
    if not ret:
        break
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    rects = detector(gray, 0)
    if len(rects) == 0:
        continue
    rect = rects[0]
    p1, p2 = (rect.left(), rect.top()), (rect.right(), rect.bottom())
    cv2.rectangle(frame, p1, p2, (0, 255, 0), 3)
    shape = predictor(gray, rect)
    shape = face_utils.shape_to_np(shape)
    cv2.imshow("face", frame)

    
    glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT)
    glBegin(GL_QUAD_STRIP)
    for x, y in shape:
        x = (p1[0] - x) / (p2[0] - p1[0])
        y = (p1[1] - y) / (p2[1] - p1[1])
        # print(x, y)
        glVertex3f(x + 0.5, y + 0.5, 0)
    glEnd()

    # obj.draw()
    # obj.show_node(point_index)
    pygame.display.flip()
    pygame.time.wait(10)

pygame.quit()
cap.release()
cv2.destroyAllWindows()