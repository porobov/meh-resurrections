# -*- coding: utf-8 -*-
import os, string, sys, re
import struct
# import png
import math
# import calculate
from PIL import Image, ImageDraw
from operator import attrgetter

class draw_scene:
    def __init__(self):
        print("Csv Lines: ")
        quantity = 10000
        width = 10
        height = 10
        startcolor = 0
        path = "img/"

        color_step = float((255 - startcolor)) / quantity
        for i in range(quantity):
            color = int(math.floor(startcolor + i * color_step))
            im = Image.new('L', (width, height), color)  # Create a blank image
            im.save(path + str(i)+".jpg")
            # print(path + str(i)+".jpg" + "\n")

        # flipped = im.transpose(Image.FLIP_TOP_BOTTOM)
        # flipped.save(img_url, 'PNG')


def main():
    scene = draw_scene()
if __name__ == '__main__':
    main()