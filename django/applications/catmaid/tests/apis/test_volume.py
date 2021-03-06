# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import json
import pytz
import datetime

from dateutil.parser import parse as parse_date
from dateutil.tz import tzutc

from django.db import connection

from .common import CatmaidApiTestCase
from catmaid.models import Volume
from catmaid.control.volume import BoxVolume


class VolumeTests(CatmaidApiTestCase):

    def setUp(self):
        super(VolumeTests, self).setUp()
        self.test_vol_1_box = BoxVolume(self.test_project_id, self.test_user_id, {
                'title': 'Test volume 1',
                'type': 'box',
                'comment': 'Comment on test volume 1',
                'min_x': -1,
                'min_y': -1,
                'min_z': -1,
                'max_x': 1,
                'max_y': 1,
                'max_z': 1
            })
        self.test_vol_1_id = self.test_vol_1_box.save()

        cursor = connection.cursor()
        cursor.execute("""
            SELECT row_to_json(v) FROM (
                SELECT id, project_id, name, comment, user_id, editor_id,
                    creation_time, edition_time, Box3D(geometry) as bbox,
                    ST_Asx3D(geometry) as geometry
                FROM catmaid_volume v
            ) v
        """)
        self.test_vol_1_data = cursor.fetchall()[0][0]
        self.test_vol_1_data['creation_time'] = parse_date(self.test_vol_1_data['creation_time'])
        self.test_vol_1_data['edition_time'] = parse_date(self.test_vol_1_data['edition_time'])

    def test_volume_edit_title_only(self):
        self.fake_authentication()
        # Change title only
        response = self.client.post('/%d/volumes/%d/' % (self.test_project_id,
            self.test_vol_1_id), {
                'title': 'New title'
            })
        self.assertEqual(response.status_code, 200)
        parsed_response = json.loads(response.content.decode('utf-8'))
        self.assertEqual(parsed_response, {
            'success': True,
            'volume_id': self.test_vol_1_id
        })
        cursor = connection.cursor()
        cursor.execute("""
            SELECT user_id, project_id, creation_time, editor_id, edition_time,
                name, comment, ST_Asx3D(geometry)
            FROM catmaid_volume
        """)
        rows = cursor.fetchall()
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row[0], self.test_user_id)
        self.assertEqual(row[1], self.test_project_id)
        self.assertTrue(abs(row[2] - self.test_vol_1_data['creation_time']) < datetime.timedelta(microseconds=1))
        self.assertEqual(row[3], self.test_user_id)
        # Edition time should be different, but needs to be set in a different
        # transaction.
        # self.assertTrue(abs(row[4] - self.test_vol_1_data['edition_time']) > datetime.timedelta(microseconds=1))
        self.assertEqual(row[5], 'New title')
        self.assertEqual(row[6], self.test_vol_1_data['comment'])
        self.assertEqual(row[7], self.test_vol_1_data['geometry'])

    def test_volume_edit_comment_only(self):
        self.fake_authentication()
        # Change comment only
        response = self.client.post('/%d/volumes/%d/' % (self.test_project_id,
            self.test_vol_1_id), {
                'comment': 'New comment'
            })
        self.assertEqual(response.status_code, 200)
        parsed_response = json.loads(response.content.decode('utf-8'))
        self.assertEqual(parsed_response, {
            'success': True,
            'volume_id': self.test_vol_1_id
        })
        cursor = connection.cursor()
        cursor.execute("""
            SELECT user_id, project_id, creation_time, editor_id, edition_time,
                name, comment, ST_Asx3D(geometry)
            FROM catmaid_volume
        """)
        rows = cursor.fetchall()
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(row[0], self.test_user_id)
        self.assertEqual(row[1], self.test_project_id)
        self.assertTrue(abs(row[2] - self.test_vol_1_data['creation_time']) < datetime.timedelta(microseconds=1))
        self.assertEqual(row[3], self.test_user_id)
        # Edition time should be different, but needs to be set in a different
        # transaction.
        # self.assertTrue(abs(row[4] - self.test_vol_1_data['edition_time']) > datetime.timedelta(microseconds=1))
        self.assertEqual(row[5], self.test_vol_1_data['name'])
        self.assertEqual(row[6], 'New comment')
        self.assertEqual(row[7], self.test_vol_1_data['geometry'])
