# -*- coding: utf-8 -*-
import os
import re
import datetime
import sys
from sets import Set



class draw_scene:

    def __init__(self):

        separator = ","
        size = 100
        path = "events/dummies/"
        images_csv = "events/dummies/images_list.csv"
        sourcePath = "img/"
        hrefPath = "http://linkto.com/"
        altText = "Alt "
        image_id = 1

        def SaveFile(csv_lines, file_name):
            with open(path + file_name, 'w') as csv_file:
                csv_file.truncate()
                csv_file.write(csv_lines)

        def csv_to_array(csv_lines):
            lines = []
            for line in csv_lines.splitlines():
                if line:
                    list = line.split(separator)
                    values = []
                    for value in list:
                        if value:
                            values.append(value)
                    lines.append(values)
            return lines


        csv_lines = open(images_csv, 'r').read()
        images_list = csv_to_array(csv_lines)

        occupied = Set()
        image_iterator = 0
        num_of_images = 0
        csv_events = ""

        for iy in range(size):
            for ix in range(size): # TODO добавить шаг
                if (not (ix, iy) in occupied):
                    img_width = int(images_list[image_iterator][0])
                    img_heigth = int(images_list[image_iterator][1])
                    img_src = str(images_list[image_iterator][2])

                    enough_space = True
                    new_coords = Set()
                    for img_iy in range(iy, iy+img_heigth):
                        for img_ix in range(ix, ix+img_width):  # TODO добавить шаг
                            new_coords.add((img_ix, img_iy))
                            #print img_ix, img_iy
                            if (((ix, iy) in occupied) or (img_ix >= size) or (img_iy >= size)):
                                enough_space = False


                    if (enough_space):
                        if (ix+img_width > size): print img_width, img_heigth, ix, iy
                        csv_events += str(image_id) + separator + \
                                     str(ix * 10) + separator + \
                                     str(iy * 10) + separator + \
                                     str((ix + img_width) * 10) + separator + \
                                     str((iy + img_heigth) * 10) + separator + \
                                     img_src + separator + \
                                     img_src + separator + \
                                     hrefPath + str(image_id) + separator + \
                                     altText + str(image_id) + separator + \
                                     str(image_id) + "\n"
                        occupied = occupied.union(new_coords)
                        image_id += 1
                        if (image_iterator < len(images_list)-1):
                            image_iterator +=1
                            pass
                        else:
                            image_iterator = 0

        SaveFile(csv_events, 'color_images_10000.csv')


def main():
    scene = draw_scene()
if __name__ == '__main__':
    main()