# -*- coding: utf-8 -*-

try:
    from PySide import QtCore
    from PySide import QtWidgets
except:
    from PyQt5.QtCore import pyqtSlot as Slot
    from PyQt5 import QtCore
    from PyQt5 import QtWidgets


class window(QMainWindow):
    def __init__(self):
        QtWidgets.QMainWindow.__init__(self)
        pass

