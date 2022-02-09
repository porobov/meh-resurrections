# -*- coding: utf-8 -*-
import os
import re
import datetime
import sys
import sqlite3
conn = sqlite3.connect('example.db')
c = conn.cursor()


c.execute('''CREATE TABLE images (
    id integer,
    x1 integer,
    y1 integer,
    x2 integer,
    y2 integer,
    src string,
    local_src string,
    href string,
    alt string,
    block_number integer,
    error string
    )''')
c.execute("INSERT INTO images VALUES (?,?,?,?,?,?,?,?,?,?,?)",(0,0,0,0,0,"","","","",0,0))

"""
c.execute('''CREATE TABLE big_picture (
    state_id integer,
    block_number integer,
    img_src string,
    img_local_src string,
    html string,
    is_serving integer,
    datetime integer,
    error string
    )''')
"""



class draw_scene:

    def __init__(self):

        def SaveFile(csv_lines, file_name):
            with open(file_name, 'w') as csv_file:
                csv_file.truncate()
                csv_file.write(csv_lines)


        separator = ","
        csv_lines = ""
        size = 100


        ix = 0
        imageID = 0
        while ix < size:
            iy = 0
            while iy < size:
                csv_lines += str(ix)+ separator \
                             + str(iy) + separator \
                             + str(imageID) + separator \
                             + str(imageID) + "\n"
                # print("Csv Lines: " + repr(csv_lines) + "\n")

                iy += 1
                imageID += 1

            ix += 1
            # print("Csv Lines: " + repr(csv_lines) + "\n")
        SaveFile (csv_lines, 'blocks_events.csv')


        imageID = 0
        csv_lines = ""

        imageID = 0
        sourcePath = "img/bw10000/"
        hrefPath = "http://linkto.com/"
        altText = "Alt "

        '''
        for ix in range (size):
            for iy in range (size):
                csv_lines += str(imageID) + separator + \
                             str(ix*10) + separator + \
                             str(iy * 10) + separator + \
                             str(ix * 10 + 10) + separator + \
                             str(iy * 10 + 10) + separator + \
                             sourcePath + str(imageID) + ".jpg" + separator + \
                             hrefPath + str(imageID) + separator + \
                             altText + str(imageID) + separator + \
                             str(imageID) + "\n"
                values = {
                    "id" : imageID,
                    "x1" : ix * 10,
                    "y1" : iy * 10,
                    "x2" : ix * 10 + 10,
                    "y2" : iy * 10 + 10,
                    "src" : sourcePath + str(imageID) + ".jpg",
                    "href" : hrefPath + str(imageID),
                    "alt" : altText + str(imageID),
                    "block_number" : imageID + 100,
                    "error_id": 0
                }

                c.execute("INSERT INTO images VALUES (?,?,?,?,?,?,?,?,?,?)",(
                    values["id"],
                    values["x1"],
                    values["y1"],
                    values["x2"],
                    values["y2"],
                    values["src"],
                    values["href"],
                    values["alt"],
                    values["block_number"],
                    values["error_id"]))

                imageID += 1
        '''

        #SaveFile(csv_lines, 'bw_images_10000.csv')
        conn.commit()
        conn.close()

def main():
    scene = draw_scene()
if __name__ == '__main__':
    main()