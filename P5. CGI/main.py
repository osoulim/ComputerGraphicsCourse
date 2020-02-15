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

obj = Obj("models/head2.obj")
camera_up = np.array([0, 1, 0])

glEnable(GL_CULL_FACE);  
glCullFace(GL_BACK);  


camera_position = np.array([-0.5, 0.2, 0]) 
glLoadIdentity()
gluLookAt(*camera_position, *obj.position, *camera_up)

glEnable(GL_LIGHTING)
glEnable(GL_LIGHT0)
glLightfv(GL_LIGHT0, GL_POSITION, (*camera_position, 0))
# glMaterialfv(GL_FRONT, GL_AMBIENT, (0, 0.8, 0.8, 1))
glShadeModel(GL_FLAT)

glEnable(GL_DEPTH_TEST)

detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor("models/shape_predictor_68_face_landmarks.dat")

cap = cv2.VideoCapture(0)

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

    shape = list(map(lambda x: np.array([(x[0] - p1[0]) / (p2[0] - p1[0]), (x[1] - p1[1]) / (p2[1] - p1[1])]), shape))

    left_eye = shape[36: 42]
    left_eye_center = sum(left_eye) / len(left_eye)
    left_eye_dis = sum(map(lambda x: np.linalg.norm(x - left_eye_center), left_eye)) / len(left_eye)

    right_eye = shape[42: 48]
    right_eye_center = sum(right_eye) / len(right_eye)
    right_eye_dis = sum(map(lambda x: np.linalg.norm(x - right_eye_center), right_eye)) / len(right_eye)

    mouth = shape[60: 68]
    mouth_center = sum(mouth) / len(mouth)
    mouth_dis = sum(map(lambda x: np.linalg.norm(x - mouth_center), mouth)) / len(mouth)
    # print(left_eye_dis, right_eye_dis, mouth_dis)

    glClear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT)
    # glBegin(GL_QUAD_STRIP)
    # for x, y in shape:
    #     x = (p1[0] - x) / (p2[0] - p1[0])
    #     y = (p1[1] - y) / (p2[1] - p1[1])
    #     glVertex3f(x + 0.5, y + 0.5, 0)
    # glEnd()

    for index in obj.left_eye:
        obj.vertices[index] += (obj.vertices[index] - obj.left_eye_center) * (left_eye_dis - 0.055)
    
    for index in obj.right_eye:
        obj.vertices[index] += (obj.vertices[index] - obj.right_eye_center) * (right_eye_dis - 0.055) 
    
    for index in obj.mouth:
        obj.vertices[index] -= (obj.vertices[index] - obj.mouth_center) * (mouth_dis - 0.5)

    obj.draw()

    # obj.show_node(point_index)
    pygame.display.flip()
    pygame.time.wait(10)

pygame.quit()
cap.release()
cv2.destroyAllWindows()