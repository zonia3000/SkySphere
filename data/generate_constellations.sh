#!/bin/bash

wget https://rawgit.com/KDE/kstars/master/kstars/data/clines.dat
wget https://rawgit.com/astronexus/HYG-Database/master/hygdata_v3.csv
javac parse.java
java Parse
