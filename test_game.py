import unittest
from engine import run, initial
from levels import LEVELS
from solutions import SOLUTIONS

class CampaignTests(unittest.TestCase):
    def test_all_levels_solvable(self):
        self.assertEqual(len(LEVELS), 36)
        self.assertEqual(len(SOLUTIONS), len(LEVELS))
        for i, solution in enumerate(SOLUTIONS):
            with self.subTest(level=i+1):
                result=run(i, solution)
                self.assertTrue(result['ok'], result)
                self.assertFalse(result['state']['gems'])
                self.assertFalse(result['state']['enemies'])
                self.assertGreater(len(result['events']), 0)
    def test_collision_has_student_line(self):
        result=run(0, 'hero.move_up()')
        self.assertFalse(result['ok']);self.assertEqual(result['line'], 1)
        self.assertIn('дерево',result['error'])
    def test_syntax_error(self):
        result=run(0,'for step in range(5)\n    hero.move_right()')
        self.assertFalse(result['ok']);self.assertEqual(result['line'], 1)
    def test_wrong_type(self):
        self.assertIn('целое',run(0,'hero.move_right("5")')['error'])
    def test_infinite_loop(self):
        self.assertIn('не заканчивается',run(0,'while True:\n    pass')['error'])
    def test_import_and_introspection_rejected(self):
        for code in ['import os', 'hero.__class__()', 'open("secret")', 'hero.move_right = 3', '__builtins__ = 3']:
            with self.subTest(code=code): self.assertFalse(run(0, code)['ok'])
    def test_required_concept(self):
        result=run(6,'hero.move_right(7)')
        self.assertFalse(result['ok']);self.assertFalse(result['concept'])
    def test_replay_starts_fresh(self):
        run(2, SOLUTIONS[2]);self.assertEqual(initial(LEVELS[2])['collected'],0)
        self.assertTrue(run(2,SOLUTIONS[2])['ok'])
    def test_gate_password(self):
        result=run(5,'password = "тьма"\nhero.move_right()\nhero.say(password)\nhero.move_right(4)')
        self.assertFalse(result['ok']);self.assertIn('закрыты',result['error'])
    def test_user_function_variables(self):
        result=run(14,SOLUTIONS[14]);self.assertEqual(result['events'][0]['variables']['distance'],'2')
    def test_large_allocations_rejected(self):
        for code in ['data = "x" * 1000000000', 'data = [0] * 1000000000', 'data = "x"\nfor i in range(30):\n    data *= 2']:
            with self.subTest(code=code):
                result = run(0, code)
                self.assertFalse(result['ok'])
                self.assertIn('велик', result['error'])
    def test_print_and_return(self):
        result=run(15,SOLUTIONS[15]+'\nprint(steps)')
        self.assertTrue(result['ok']);self.assertEqual(result['events'][-1]['message'],'Вывод: 6')

if __name__=='__main__': unittest.main()
