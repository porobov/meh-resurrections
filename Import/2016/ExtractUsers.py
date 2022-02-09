# -*- coding: utf-8 -*-
import os
import re
import html.parser
import datetime
import sys

dir_name = "FilesForExtraction/"
current_dir = "Current(B)/"
past_dir = "Past(A)/"
pattern = re.compile("/class='grey_border' alt='(.*?)'")

class FileHandler:
    def list_files_by_extensions(dir_name):
        fileList = []
        for file in os.listdir(dir_name):
            dirfile = os.path.join(dir_name, file)
            if os.path.isfile(dirfile):
                fileList.append(file)
        return fileList

    def merge_files(self):
        #TODO if filelist
        text = ""
        fileList = FileHandler.list_files_by_extensions(self)
        for file_name in fileList:
            text += open(self+file_name, 'r').read() + "\n"
            print(file_name+"000000000000000000000000000")
        return text

    def str_to_file(csv_lines, file_name):
        with open(file_name, 'w') as csv_file:
            csv_file.truncate()
            csv_file.write(csv_lines)

class draw_scene:
    def __init__(self):

        def lines_to_dict(csv_lines):
            dict = {}
            for line in csv_lines.splitlines():
                if line:
                    list = line.split(";")
                    key = list.pop(0)
                    if not key in dict:
                        values = []
                        for value in list:
                            if value:
                                values.append(value)
                        dict.update({key: values})
            return dict

        def dict_to_lines(dict):
            number_of_users = 0
            csv_lines = ""
            for key, values in dict.items():
                csv_line_values = ""
                for value in values:
                    csv_line_values += value+";"
                csv_lines += key+";"+csv_line_values+"\n"
                number_of_users += 1
            print("Number of users: " + repr(number_of_users) + "\n")
            return csv_lines

        users_dict = {}
        pattern = re.compile('(?:div class="(?:user-name|username)".*\n?.*people/)(\w*)(?:.*>)(.*)(?:</a>)')
        #pattern = re.compile('(?:div class="user-name".*people/)(\w*)(?:.*>)(.*)(?:</a>)')
        #<a href="https://www.etsy.com/people/mypieceofwood" rel="nofollow">Hanna G</a>
        fileList = FileHandler.list_files_by_extensions(dir_name)
        for file_name in fileList:

            text = open(dir_name+file_name, 'r').read()
            print(file_name)
            print(type(text))
            matches = re.findall(pattern, text)
            if matches:
                for account, name in matches:
                    dict_record = {html.unescape(account): [name, "https://www.etsy.com/people/"+account, datetime.date.today().isoformat()]}
                    if not html.unescape(name) in users_dict:
                        users_dict.update(dict_record)

        #write to .csv file
        FileHandler.str_to_file(dict_to_lines(users_dict), 'extracted.csv')

        # Compose dictionaries from files in directories
        past_users = lines_to_dict(FileHandler.merge_files(past_dir))
        current_users = lines_to_dict(FileHandler.merge_files(current_dir))
        intersecting = {}
        new = {}
        dropped_out = {}  # unfollowed
        merged = past_users

        # Intersecting and New
        # TODO Empty
        for key, values in current_users.items():
            if key in past_users:
                intersecting.update({key: values})
            else:
                new.update({key: values})

        # Dropped out
        for key, values in past_users.items():
            if not key in intersecting:
                dropped_out.update({key: values})

        # Merge all
        merged.update(new)

        FileHandler.str_to_file(dict_to_lines(intersecting), 'intersecting(BxA).csv')
        FileHandler.str_to_file(dict_to_lines(new), 'new(B-A).csv')
        FileHandler.str_to_file(dict_to_lines(dropped_out), 'dropped_out(A-B).csv')
        FileHandler.str_to_file(dict_to_lines(merged), 'merged(B+A).csv')

        print(dict_to_lines(new))

def main():
    scene = draw_scene()

if __name__ == '__main__':
    main()