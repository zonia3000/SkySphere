#!/bin/bash

wget https://cdn.jsdelivr.net/gh/KDE/kstars/kstars/data/clines.dat
wget https://rawgit.com/astronexus/HYG-Database/master/hygdata_v3.csv
javac parse.java
java Parse
