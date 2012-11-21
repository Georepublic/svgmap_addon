#! /usr/bin/python

import sys
import os
import urllib2
import urlparse
import xml.etree.ElementTree as ET

def saveSvgAndLocalTile(url, outDir):
	# save svg
	svgUrl = urlparse.urlparse(url)
	fileName = outDir + svgUrl.path
	print('fileName:%s' % fileName)
	if not os.path.exists(fileName):
		dirName = os.path.dirname(fileName)
		if not os.path.exists(dirName):
			os.makedirs(dirName)
		try:
			res = urllib2.urlopen(svgUrl.geturl())
			svgFile = open(fileName, 'wb')
			svgFile.write(res.read())
			svgFile.close()
		except Exception as e:
			print(e.message)
			return
	
	# parse svg
	tree = ET.parse(fileName)
	root = tree.getroot()
	
	# save image
	for img in root.iter('{http://www.w3.org/2000/svg}image'):
		imagePath = img.get('{http://www.w3.org/1999/xlink}href')
		imgUrl = urlparse.urlparse(imagePath)
		if not imgUrl.scheme.startswith('http'):
			imgUrl = urlparse.urlparse(urlparse.urljoin(svgUrl.geturl(), imagePath))
			imgFileName = outDir + '/' + imgUrl.path
			print('imgFileName:%s' % imgFileName)
			if not os.path.exists(imgFileName):
				imgDirName = os.path.dirname(imgFileName)
				if not os.path.exists(imgDirName):
					os.makedirs(imgDirName)
				try:
					imgRes = urllib2.urlopen(imgUrl.geturl())
					imgFile = open(imgFileName, 'wb')
					imgFile.write(imgRes.read())
					imgFile.close()
				except Exception as e:
					print(e.message)
					continue
			
	# save link svg recursively
	for anim in root.iter('{http://www.w3.org/2000/svg}animation'):
		linkPath = anim.get('{http://www.w3.org/1999/xlink}href')
		saveSvgAndLocalTile(urlparse.urljoin(svgUrl.geturl(), linkPath), outDir)

if __name__ == "__main__":
	args = sys.argv
	if len(args) != 3:
		print "Usage:./fetchKddiSvg.py [Svg url] [Output directory]"
		sys.exit()
	
	saveSvgAndLocalTile(args[1], args[2])
