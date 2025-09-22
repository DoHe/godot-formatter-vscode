class_name TestClass extends Node

const EXAMPLE_CONST: String = "Example"

@export var example_exported_var: String = "Example"

var example_var: String = "Example"

@onready var test = $TestNode


func _ready():
	print("TestClass is ready")


func test_method():
	print("Test method called")

	var a_long_dict := {
		"key1": "value1",
		"key2": "value2",
		"key3": "value3",
		"key4": "value4",
	}
