# -*- coding: utf-8 -*-
import os
import re
# import html.parser
import datetime
import sys
from string import Template
from PIL import Image, ImageDraw
from sets import Set
from imgurpython import ImgurClient
from imgurpython.helpers.error import ImgurClientError
import requests
import sqlite3
import os
import urllib
import jinja2
from urlparse import urlparse
import urllib

# JINJA
JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'],
    autoescape=False)
my_domain = "http://localhost:8080"

# DB
conn = sqlite3.connect('example.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

# IMGUR
client_id = 'b4a797712e86ee2'
client_secret = 'e50c3efcd8b56b28c6181fc01785066b3ed0837f'
client = ImgurClient(client_id, client_secret)

separator = ","
blocksCSVpath = "blocks_events.csv"
#img_events_csv = "events/dummies/bw_images_10000.csv"
img_events_csv = "events/dummies/color_images_10000.csv"
big_picture_local_path = "html/bigpicture/"
imgDbPath = "img/file_number"
# my_domain = "http://one-million-ether.appspot.com/"
# my_domain = "http://localhost:8080/"


def SaveFile(csv_lines, file_name):
    with open(file_name, 'w') as csv_file:
        csv_file.truncate()
        csv_file.write(csv_lines)


def csv_to_dict(csv_lines):
    dict = {}
    for line in csv_lines.splitlines():
        if line:
            list = line.split(separator)
            key = list.pop(0)
            if not key in dict:
                values = []
                for value in list:
                    if value:
                        values.append(value)
                dict.update({key: values})
    return dict


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



        
class draw_scene:
    def __init__(self):

        run_this = True


        # LISTEN TO ETHEREUM EVENTS
        ## trigger updates if any changes


        # USERS. UPDATE DBs
        ## users json to local db
        ## upload users to app engine


        # IMAGES AND HTML. UPDATE LOCAL DB.

        ## IMAGES JSONs TO LOCAL DB
        if (run_this == True):
            c.execute('''SELECT * FROM images ORDER BY id DESC LIMIT 1''')
            last_image = c.fetchone()
            last_image_id = last_image['id']
            print ("Last image ID: " + repr(last_image_id))

            csv_lines = open(img_events_csv, 'r').read()
            imagesCSVArray = csv_to_array(csv_lines)

            new_images = []
            ## read all image events to dict (Image DB)
            for csv_line in imagesCSVArray:
                values = {
                    "id": int(csv_line[0]),
                    "x1": int(csv_line[1]),
                    "y1": int(csv_line[2]),
                    "x2": int(csv_line[3]),
                    "y2": int(csv_line[4]),
                    "src": str(csv_line[5]),
                    "local_src": str(csv_line[6]),
                    "href": str(csv_line[7]),
                    "alt": str(csv_line[8]),
                    "block_number": int(csv_line[9]),
                    "error": 0,
                }
                if (values["id"] > last_image_id):
                    new_images.append(values)

            for new_image in new_images:
                c.execute("INSERT INTO images VALUES (?,?,?,?,?,?,?,?,?,?,?)", (
                    new_image["id"],
                    new_image["x1"],
                    new_image["y1"],
                    new_image["x2"],
                    new_image["y2"],
                    new_image["src"],
                    new_image["local_src"],
                    new_image["href"],
                    new_image["alt"],
                    new_image["block_number"],
                    new_image["error"]))
            conn.commit()



        ## VALIDATE IMAGES AND DOWNLOAD TO LOCAL DRIVE
        if (run_this == True):
            images_to_download = c.execute('''SELECT *
                                        FROM images
                                        WHERE local_src is null or local_src = ''
                                        ORDER BY id''')
            for image in images_to_download:
                values = {}
                url_is_ok = False
                at_imgur = False

                f = client.get_image("KqmazwD")
                testfile = urllib.URLopener()
                testfile.retrieve(f.link, "KqmazwD.jpg")

                #validate url
                if urlparse(image["src"]).netloc == "i.imgur.com" or image["src"].find("i.imgur.com") == 0:
                    url_is_ok = True # TODO check unicode, small letters
                    at_imgur = True
                if image["src"].find("img") != 0:
                    url_is_ok = True
                    at_imgur = False

                if url_is_ok:
                    if at_imgur:
                        pass

                    else:
                        print ("hey")
                        c.execute('''UPDATE images
                                    SET local_src = 'test'
                                    WHERE id=1501''')
                        conn.commit()

                else:
                    values["error"] = "Wrong url"




        # IMAGES AND HTML. UPDATE WEBSITE DB

        c.execute('''SELECT * FROM big_picture ORDER BY id DESC LIMIT 1''')
        last_big_picture = c.fetchone()
        print ("Big picture last block number: " + repr(last_big_picture[1]))

        c.execute('''SELECT * FROM images ORDER BY block_number DESC LIMIT 1''')
        last_image_event = c.fetchone()
        print ("Images events last block number: " + repr(last_image_event[8]))

        if (last_big_picture['block_number'] < last_image_event['block_number']):
            image_events = c.execute('''SELECT * FROM images WHERE block_number > ? ORDER BY block_number DESC''',
                                     (last_big_picture['block_number'],))

            occupied = Set ()
            new_images = []

            for image in image_events:
                new_coords = Set ()
                enough_space = True
                for iy in range(image["y1"],image["y2"],10):
                    for ix in range(image["x1"],image["x2"],10):
                        #iy =
                        new_coords.add((ix, iy))
                        if (ix, iy) in occupied: # TODO or (ix >= size) or (iy >= size)):
                            enough_space = False
                            pass

                if enough_space:
                    new_images.append(image)
                    occupied = occupied.union(new_coords)

                if (len(occupied) >= 10000):
                    print "all 10 000 blocks are occupied"
                    break # if all 10 000 blocks are occupied
            print (len(new_images))
            print (len(occupied))


            ## generate big image
            if (len(occupied) > 0):
                new_big_picture_id = last_big_picture["id"] + 1
                new_big_picture = {
                    "id": new_big_picture_id,
                    "block_number": last_image_event['block_number'],
                    "img_src": "",
                    "img_local_src": big_picture_local_path + str(new_big_picture_id) + ".png",
                    "html": "",
                    "is_serving": 0,
                    "datetime": 0,
                    "error": "",
                }

                ## generate bitmap
                if (run_this == True):
                    #new_big_picture_bitmap = Image.open(last_big_picture["img_local_src"]) # TODO use bg image instead
                    new_big_picture_bitmap = Image.new("RGB", (1000, 1000),"#ffffff")  # Create a blank image
                    for iIMG in new_images:
                        box =  (iIMG["x1"],iIMG["y1"],iIMG["x2"],iIMG["y2"])
                        im = Image.open(iIMG["src"])
                        cropping_box = (0,0,iIMG["x2"]-iIMG["x1"],iIMG["y2"]-iIMG["y1"])
                        cropped_im = im.crop(cropping_box)
                        new_big_picture_bitmap.paste(cropped_im, box)

                    #new_big_picture_bitmap.save(new_big_picture["img_local_src"])
                    new_big_picture_bitmap.save(new_big_picture["img_local_src"], "PNG")
                    print ("new_big_picture: " + repr(new_big_picture))


                ## generate html
                if (run_this == True):
                    image_html_lines = ""
                    for iIMG in reversed(new_images):
                        template_values = iIMG
                        s = Template('<area onmouseover=\"d(this)\" onmouseout=\"e(this)\" shape=\"rect\" coords=\"$x1,$y1,$x2,$y2\" href=\"$href\" title=\"$alt\">\n')
                        image_html_lines += s.substitute(template_values)

                    template = JINJA_ENVIRONMENT.get_template('html/index-template.html')
                    temporary_declaration = "./bigpicture/" + str(new_big_picture["id"]) + ".png"
                    html_page = template.render(data = image_html_lines, big_picture = temporary_declaration).encode("UTF-8") #template.render returns unicode
                    SaveFile(html_page,"html/index.html")



        ## upload to imgur
        """
        try:
            response = client.upload_from_path(big_picture_local_path)
        except ImgurClientError as e:
            print(e.error_message)
            print(e.status_code)
        big_image_link = response[u'link'] //TODO все ссылки сделать уникодом
        print (big_image_link)"""

        big_image_link = "http://i.imgur.com/AjSTZU5.jpg"

        """
        fh = open('test.png', 'rb');
        base64img = base64.b64encode(fh.read())
        r = requests.post(url, data={'key': api_key, 'image':base64img})
        """
        #r = requests.get("https://api.imgur.com/3/credits")

        ## Write bigPicture to DB
        """
        c.execute("INSERT INTO images VALUES (?,?,?,?,?,?,?,?,?,?)", (
            new_image["id"],
            new_image["x1"],
            new_image["y1"],
            new_image["x2"],
            new_image["y2"],
            new_image["src"],
            new_image["href"],
            new_image["alt"],
            new_image["block_number"],
            new_image["error_id"]))
        conn.commit()
        """

        ## upload html to app engine
        """
        r = requests.post(my_domain, data={'parent_id': 1, 'action': 'adduser', 'user_mail': 'porobov@sdf.com'})
        print(r.status_code, r.reason)
        print(r.text[:300] + '...')
        """

def main():
    scene = draw_scene()

if __name__ == '__main__':
    main()

"""
    html_page = <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
            "http://www.w3.org/TR/html4/loose.dtd">
    <html>
    <head>
    <style>
    img {
        position: absolute;
        padding: 0;
        border: 0;
        margin: 0;
    }
    </style>
        <title></title>
    </head>
    <body>
            """