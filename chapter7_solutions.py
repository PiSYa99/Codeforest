"""Эталонные решения новой главы для наставника."""
SOLUTIONS = [
'''distance = 2
for crystal in range(3):
    hero.move_right(distance)
    hero.collect()
hero.move_right()''',
'''while not hero.at_exit():
    if hero.enemy_ahead():
        hero.attack()
    else:
        hero.move_right()
    if hero.gem_here():
        hero.collect()''',
'''def step_and_gather(direction):
    hero.move(direction)
    if hero.gem_here():
        hero.collect()
route = ["right", "right", "down", "down", "right", "right", "right"]
for direction in route:
    step_and_gather(direction)''',
'''runes = [2, 3, 4]
total = 0
for number in runes:
    total += number
hero.move_right()
hero.say(str(total))
hero.move_right(5)''',
'''while not hero.at_exit():
    if hero.enemy_ahead():
        hero.attack()
    else:
        if hero.path_clear("right") and not hero.enemy_ahead():
            hero.move_right()
        else:
            hero.move_down()
    if hero.gem_here():
        hero.collect()''',
'''route = ["right", "right", "right", "down", "down"]
for direction in route:
    if hero.gem_here() or hero.enemy_ahead(direction):
        if hero.gem_here():
            hero.collect()
        if hero.enemy_ahead(direction):
            hero.attack(direction)
    hero.move(direction)''',
'''while not hero.at_exit():
    if hero.enemy_ahead("right"):
        hero.attack("right")
    elif hero.enemy_ahead("down"):
        hero.attack("down")
    elif hero.path_clear("right"):
        hero.move_right()
    else:
        hero.move_down()
    if hero.gem_here():
        hero.collect()''',
'''while True:
    if hero.at_exit():
        break
    hero.move_right()
    if hero.gem_here():
        hero.collect()''',
'''while not hero.at_exit():
    if hero.enemy_ahead():
        hero.attack()
        continue
    hero.move_right()
    if hero.gem_here():
        hero.collect()''',
'''position = 0
for checkpoint in range(2, 7, 2):
    hero.move_right(checkpoint - position)
    hero.collect()
    position = checkpoint
hero.move_right()''',
'''route = ["right", "right", "down", "down", "right", "right"]
for index in range(len(route)):
    hero.move(route[index])
    if hero.gem_here():
        hero.collect()''',
'''distances = [2, 1, 3]
index = 0
while index < len(distances):
    hero.move_right(distances[index])
    hero.collect()
    index += 1
hero.move_right()''',
'''route = [("right", 2), ("down", 2), ("right", 3)]
for direction, distance in route:
    hero.move(direction, distance)
    if hero.gem_here():
        hero.collect()''',
'''def can_go(direction):
    return hero.path_clear(direction) and not hero.enemy_ahead(direction)
while not hero.at_exit():
    if can_go("right"):
        hero.move_right()
    else:
        hero.move_down()
    if hero.gem_here():
        hero.collect()''',
'''def travel(direction, steps=1):
    hero.move(direction, steps)
    if hero.gem_here():
        hero.collect()
travel("right", 2)
travel("down", 2)
travel("right")
travel("right")''',
'''route = ["right", "up", "down", "down", "right", "right"]
route[1] = "right"
for direction in route:
    hero.move(direction)
    if hero.gem_here():
        hero.collect()''',
'''directions = ["right", "down", "left", "down", "right"]
for direction in directions:
    for step in range(2):
        hero.move(direction)
        if hero.gem_here():
            hero.collect()''',
'''def safe_step(direction):
    while hero.enemy_ahead(direction):
        hero.attack(direction)
    hero.move(direction)
    if hero.gem_here():
        hero.collect()
route = [("right", 3), ("down", 2), ("left", 3), ("down", 2), ("right", 4)]
for direction, distance in route:
    for step in range(distance):
        safe_step(direction)''',
]
