"""Эталонные решения для преподавателя и проверки кампании."""
SOLUTIONS = [
'hero.move_right(5)',
'hero.move_right(2)\nhero.move_down(2)\nhero.move_right(2)',
'hero.move_right(2)\nhero.collect()\nhero.move_right(2)\nhero.collect()\nhero.move_right()',
'steps = 5\nhero.move_right(steps)\nhero.collect()\nhero.move_right()',
'steps = 3 + 4\nhero.move_right(steps)\nhero.collect()\nhero.move_right()',
'password = "свет"\nhero.move_right()\nhero.say(password)\nhero.move_right(4)',
'for step in range(7):\n    hero.move_right()',
'for step in range(5):\n    hero.move_right()\n    hero.collect()\nhero.move_right()',
'for floor in range(2):\n    for step in range(2):\n        hero.move_right()\n    hero.move_down()\nhero.move_right(2)',
'if hero.enemy_ahead():\n    hero.attack()\nhero.move_right(5)',
'for step in range(6):\n    hero.move_right()\n    if hero.gem_here():\n        hero.collect()',
'for turn in range(7):\n    if hero.enemy_ahead():\n        hero.attack()\n    else:\n        hero.move_right()\n    if hero.gem_here():\n        hero.collect()',
'while not hero.at_exit():\n    hero.move_right()\n    if hero.gem_here():\n        hero.collect()',
'def gather():\n    hero.move_right()\n    hero.collect()\nfor step in range(3):\n    gather()\nhero.move_right()',
'def gather(distance):\n    hero.move_right(distance)\n    hero.collect()\ngather(2)\ngather(3)\nhero.move_right()',
'def double(number):\n    return number * 2\nsteps = double(3)\nhero.move_right(steps)\nhero.collect()\nhero.move_right()',
'route = ["right", "right", "down", "down", "right", "right"]\nfor direction in route:\n    hero.move(direction)',
'def take_turn():\n    if hero.enemy_ahead():\n        hero.attack()\n    else:\n        hero.move_right()\n    if hero.gem_here():\n        hero.collect()\nwhile not hero.at_exit():\n    take_turn()',
]

from chapter7_solutions import SOLUTIONS as CHAPTER7_SOLUTIONS
SOLUTIONS.extend(CHAPTER7_SOLUTIONS)
