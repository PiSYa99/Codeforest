import ast
import json
from pathlib import Path
import runpy
import unittest
from engine import run, validate, concept_ok
from levels import LEVELS
from solutions import SOLUTIONS

class ChapterSevenTests(unittest.TestCase):
    def test_one_new_chapter_with_three_review_quests(self):
        self.assertEqual([l['id'] for l in LEVELS[18:]], list(range(18, 36)))
        self.assertEqual({l['chapter'] for l in LEVELS[18:]}, {7})
        self.assertEqual(sum(l['topic'].startswith('Повторение:') for l in LEVELS[18:]), 3)
        self.assertTrue(all(l['topic'].startswith('Повторение:') for l in LEVELS[18:21]))
    def test_original_campaign_unchanged(self):
        before = runpy.run_path(str(Path(__file__).parent / 'work/chapter7_backup/levels.py'))['LEVELS']
        self.assertEqual(LEVELS[:18], before)
    def test_new_requirements_and_hints(self):
        for i in range(18, 36):
            with self.subTest(level=i+1):
                self.assertEqual(len(LEVELS[i]['hints']), 2)
                self.assertTrue(concept_ok(validate(SOLUTIONS[i]), LEVELS[i]['requirement']))
                self.assertFalse(concept_ok(validate('hero.move_right()'), LEVELS[i]['requirement']))
                self.assertFalse(run(i, LEVELS[i]['starter'])['ok'])
    def test_friendly_index_error(self):
        result = run(28, 'route = ["right"]\nhero.move(route[1])')
        self.assertEqual(result['line'], 2)
        self.assertIn('Индекс', result['error'])
    def test_final_collects_all_objects(self):
        result = run(35, SOLUTIONS[35])
        self.assertTrue(result['ok'])
        self.assertEqual(result['state']['collected'], 5)
        self.assertEqual(result['state']['defeated'], 3)

if __name__ == '__main__': unittest.main()
